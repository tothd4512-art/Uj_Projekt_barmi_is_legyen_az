import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { Store } from './store.mjs';
import { checkEnvironment, runBuild, cancelCurrentBuild, sampleProjectDir } from './build.mjs';
import { isValidAppId, isValidVersion, sanitizeFileName, isSafeZipEntry } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function safeJoin(base, name) {
  const target = path.resolve(base, name);
  const resolvedBase = path.resolve(base);
  if (target !== resolvedBase && !target.startsWith(resolvedBase + path.sep)) {
    throw new Error('Érvénytelen útvonal.');
  }
  return target;
}

async function findWebRoot(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  if (entries.some(e => e.isFile() && e.name === 'index.html')) return dir;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const candidate = path.join(dir, e.name);
    const sub = await fs.readdir(candidate).catch(() => []);
    if (sub.includes('index.html')) return candidate;
  }
  return null;
}

export async function startServer(options = {}) {
  const dataDir = options.dataDir || process.env.DATA_DIR || path.join(ROOT, 'data');
  const host = options.host || process.env.HOST || '127.0.0.1';
  const requestedPort = options.port ?? Number(process.env.PORT || 3001);
  const demoMode = options.demoMode ?? (process.env.DEMO_MODE === '1' || (host === '0.0.0.0' && process.env.ALLOW_REMOTE_BUILD !== '1'));

  const store = new Store(dataDir);
  await store.init();

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  const upload = multer({ dest: path.join(dataDir, 'uploads'), limits: { fileSize: 200 * 1024 * 1024 } });

  async function ensureSampleProject() {
    if (store.projects.length > 0) return;
    const id = uuidv4();
    const sourcePath = path.join(dataDir, 'projects', id, 'source');
    await fs.mkdir(sourcePath, { recursive: true });
    await fs.cp(sampleProjectDir(), sourcePath, { recursive: true });
    await store.addProject({
      id,
      name: 'Hello Creaft',
      appId: 'hu.creaft.hello',
      version: '1.0.0',
      description: 'Mintaprojekt, amin kipróbálhatod a fordítást.',
      sourcePath,
      iconPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  await ensureSampleProject();

  let currentJobId = null;

  function denyDemo(_req, res, next) {
    if (demoMode) {
      return res.status(403).json({ error: 'Böngészős előnézetben a módosítás és a fordítás le van tiltva. A valódi funkciók az asztali appban érhetők el.' });
    }
    next();
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'Creaft', demoMode }));
  app.get('/api/environment', async (_req, res) => res.json(await checkEnvironment()));
  app.get('/api/projects', (_req, res) => res.json(store.projects));

  app.post('/api/projects/sample', denyDemo, async (_req, res) => {
    const id = uuidv4();
    const sourcePath = path.join(dataDir, 'projects', id, 'source');
    await fs.mkdir(sourcePath, { recursive: true });
    await fs.cp(sampleProjectDir(), sourcePath, { recursive: true });
    const project = await store.addProject({
      id,
      name: 'Új mintaprojekt',
      appId: `hu.creaft.sample${Date.now().toString(36)}`,
      version: '1.0.0',
      description: '',
      sourcePath,
      iconPath: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.json(project);
  });

  app.post('/api/projects/import', denyDemo, upload.single('zip'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Nem érkezett ZIP fájl.' });
      const id = uuidv4();
      const projectDir = path.join(dataDir, 'projects', id);
      const extractDir = path.join(projectDir, 'extracted');
      await fs.mkdir(extractDir, { recursive: true });

      const zip = new AdmZip(req.file.path);
      let total = 0;
      for (const entry of zip.getEntries()) {
        if (!isSafeZipEntry(entry.entryName)) throw new Error('A ZIP érvénytelen útvonalat tartalmaz.');
        total += entry.header.size;
        if (total > 500 * 1024 * 1024) throw new Error('A ZIP kicsomagolt mérete túl nagy.');
        const dest = safeJoin(extractDir, entry.entryName);
        if (entry.isDirectory) {
          await fs.mkdir(dest, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, entry.getData());
        }
      }
      await fs.unlink(req.file.path).catch(() => {});

      const webRoot = await findWebRoot(extractDir);
      if (!webRoot) throw new Error('Nem található index.html a ZIP-ben.');

      const sourcePath = path.join(projectDir, 'source');
      await fs.rename(webRoot, sourcePath);
      const name = String(req.body.name || path.basename(req.file.originalname, '.zip')).slice(0, 120);
      const appId = req.body.appId || `hu.creaft.${id.slice(0, 8)}`;
      if (!isValidAppId(appId)) throw new Error('Érvénytelen csomagazonosító (pl. hu.cegnev.app).');
      const project = await store.addProject({
        id,
        name,
        appId,
        version: '1.0.0',
        description: String(req.body.description || '').slice(0, 500),
        sourcePath,
        iconPath: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      res.json(project);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/projects/:id', denyDemo, async (req, res) => {
    const project = store.projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Nincs ilyen projekt.' });
    const patch = {};
    if ('name' in req.body) patch.name = String(req.body.name).trim().slice(0, 120);
    if ('description' in req.body) patch.description = String(req.body.description).slice(0, 500);
    if ('appId' in req.body) {
      if (!isValidAppId(req.body.appId)) return res.status(400).json({ error: 'Érvénytelen csomagazonosító (pl. hu.cegnev.app).' });
      patch.appId = req.body.appId;
    }
    if ('version' in req.body) {
      if (!isValidVersion(req.body.version)) return res.status(400).json({ error: 'A verzió ilyen alakú legyen: 1.0.0' });
      patch.version = req.body.version;
    }
    if (patch.name === '') return res.status(400).json({ error: 'A projektnév nem lehet üres.' });
    const updated = await store.updateProject(req.params.id, patch);
    res.json(updated);
  });

  app.delete('/api/projects/:id', denyDemo, async (req, res) => {
    await store.deleteProject(req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/jobs', (_req, res) => res.json(store.jobs));
  app.get('/api/jobs/:id', (req, res) => {
    const job = store.jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Nincs ilyen feladat.' });
    res.json(job);
  });

  app.post('/api/projects/:id/build', denyDemo, async (req, res) => {
    const project = store.projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Nincs ilyen projekt.' });
    const target = req.body.target;
    if (!['windows', 'android'].includes(target)) return res.status(400).json({ error: 'Érvénytelen cél.' });
    if (currentJobId) return res.status(409).json({ error: 'Már fut egy fordítás. Várd meg, míg befejeződik, vagy szakítsd meg.' });

    const indexPath = path.join(project.sourcePath, 'index.html');
    try { await fs.access(indexPath); }
    catch { return res.status(400).json({ error: 'A projektben nem található index.html.' }); }

    if (target === 'android') {
      const env = await checkEnvironment();
      if (!env.canBuildAndroid) {
        return res.status(400).json({ error: 'Android fordításhoz Java és Android SDK szükséges. Nézd meg a Környezet oldalt.' });
      }
    }

    const jobId = uuidv4();
    currentJobId = jobId;
    const workspace = path.join(dataDir, 'builds', jobId);
    await fs.mkdir(workspace, { recursive: true });
    const job = await store.addJob({
      id: jobId,
      projectId: project.id,
      projectName: project.name,
      target,
      status: 'running',
      logs: [],
      createdAt: new Date().toISOString(),
      finishedAt: null,
      artifactId: null,
      error: null,
    });

    const onLog = (line) => { store.appendLog(jobId, line).catch(() => {}); };
    onLog(`Fordítás indítása: ${project.name} → ${target === 'windows' ? 'Windows EXE' : 'Android APK'}`);

    runBuild({ project, target, workspace, onLog })
      .then(async (artifactPath) => {
        const artifactId = uuidv4();
        const ext = path.extname(artifactPath);
        const fileName = `${sanitizeFileName(project.name)}-${project.version}-${target}${ext}`;
        const destDir = path.join(dataDir, 'artifacts', artifactId);
        await fs.mkdir(destDir, { recursive: true });
        const dest = path.join(destDir, fileName);
        await fs.copyFile(artifactPath, dest);
        const stat = await fs.stat(dest);
        const artifact = await store.addArtifact({
          id: artifactId,
          jobId,
          projectId: project.id,
          name: fileName,
          path: dest,
          size: stat.size,
          target,
          createdAt: new Date().toISOString(),
        });
        await store.updateJob(jobId, { status: 'succeeded', finishedAt: new Date().toISOString(), artifactId: artifact.id });
        onLog(`Kész: ${fileName}`);
      })
      .catch(async (err) => {
        const existing = store.jobs.find(j => j.id === jobId);
        if (existing?.status === 'cancelled') return;
        await store.updateJob(jobId, { status: 'failed', finishedAt: new Date().toISOString(), error: err.message });
        onLog(`Hiba: ${err.message}`);
      })
      .finally(() => {
        if (currentJobId === jobId) currentJobId = null;
      });

    res.json(job);
  });

  app.post('/api/jobs/:id/cancel', denyDemo, async (req, res) => {
    if (currentJobId !== req.params.id) return res.status(400).json({ error: 'Ez a feladat nem szakítható meg.' });
    cancelCurrentBuild();
    await store.updateJob(req.params.id, { status: 'cancelled', finishedAt: new Date().toISOString() });
    res.json({ ok: true });
  });

  app.get('/api/artifacts', (_req, res) => res.json(store.artifacts));
  app.get('/api/artifacts/:id/download', async (req, res) => {
    const artifact = store.artifacts.find(a => a.id === req.params.id);
    if (!artifact) return res.status(404).json({ error: 'Nincs ilyen fájl.' });
    res.download(artifact.path, artifact.name);
  });

  const dist = path.join(ROOT, 'dist');
  try {
    await fs.access(dist);
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } catch {
    app.get('/', (_req, res) => res.send('Creaft API fut. A felülethez indítsd a Vite dev szervert vagy készíts buildet.'));
  }

  const server = app.listen(requestedPort, host);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : requestedPort;
  console.log(`Creaft szerver: http://${host}:${port}${demoMode ? ' (előnézeti mód)' : ''}`);

  return {
    server,
    port,
    demoMode,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirect) {
  startServer().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
