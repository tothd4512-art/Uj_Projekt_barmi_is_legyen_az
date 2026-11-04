import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import spawn from 'cross-spawn';
import treeKill from 'tree-kill';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function which(cmd) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return res.status === 0 ? res.stdout.trim().split(/\r?\n/)[0] : null;
}

export async function checkEnvironment() {
  const java = which('java');
  const javac = which('javac');
  const gradle = which('gradle');
  const adb = which('adb');
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || null;
  const node = process.version;
  const npm = which('npm');
  let javaVersion = null;
  if (java) {
    const r = spawnSync(java, ['-version'], { encoding: 'utf8' });
    javaVersion = (r.stderr || r.stdout || '').split(/\r?\n/)[0] || null;
  }
  return {
    node,
    npm: !!npm,
    java: !!java,
    javac: !!javac,
    javaVersion,
    gradle: !!gradle,
    adb: !!adb,
    androidHome,
    androidSdk: !!androidHome || !!adb,
    platform: process.platform,
    canBuildWindows: process.platform === 'win32' || !!which('wine'),
    canBuildAndroid: !!java && !!androidHome,
  };
}

const childRef = { current: null };

function run(cmd, args, cwd, onLog, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env, npm_config_yes: 'true' },
      windowsHide: true,
    });
    childRef.current = child;
    let buffer = '';
    const handle = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) if (line.trim()) onLog(line);
    };
    child.stdout?.on('data', handle);
    child.stderr?.on('data', handle);
    child.on('error', reject);
    child.on('close', (code) => {
      if (childRef.current === child) childRef.current = null;
      if (buffer.trim()) onLog(buffer);
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} — kilépési kód: ${code}`));
    });
  });
}

export function cancelCurrentBuild() {
  const child = childRef.current;
  if (child?.pid) {
    treeKill(child.pid, 'SIGTERM');
    childRef.current = null;
  }
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

export async function buildWindows(project, workspace, onLog) {
  const dir = path.join(workspace, 'windows');
  await fs.mkdir(dir, { recursive: true });
  const appDir = path.join(dir, 'app');
  await copyDir(project.sourcePath, appDir);

  const safeName = project.appId.split('.').pop().replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const pkg = {
    name: safeName,
    version: project.version || '1.0.0',
    description: project.description || project.name,
    main: 'main.cjs',
    author: 'Creaft',
    license: 'MIT',
    devDependencies: {
      electron: '^33.3.1',
      'electron-builder': '^25.1.8',
    },
    build: {
      appId: project.appId,
      productName: project.name,
      directories: { output: 'out' },
      files: ['main.cjs', 'app/**/*'],
      win: { target: 'portable' },
      portable: { artifactName: '${productName}-${version}-windows.exe' },
    },
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  const main = `const { app, BrowserWindow } = require('electron');
const path = require('node:path');
function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    title: ${JSON.stringify(project.name)},
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`;
  await fs.writeFile(path.join(dir, 'main.cjs'), main);

  onLog('Windows csomag előkészítése…');
  if (process.platform !== 'win32') {
    onLog('Figyelem: nem Windows rendszeren futunk; a keresztfordításhoz Wine vagy Windows ajánlott.');
  }
  await run('npm', ['install', '--no-audit', '--no-fund'], dir, onLog);
  onLog('Electron alkalmazás fordítása és csomagolása…');
  await run('npx', ['electron-builder', '--win', 'portable', '--x64'], dir, onLog);

  const outDir = path.join(dir, 'out');
  const files = await fs.readdir(outDir);
  const exe = files.find(f => f.endsWith('.exe'));
  if (!exe) throw new Error('Nem készült EXE a kimeneti mappában.');
  return path.join(outDir, exe);
}

export async function buildAndroid(project, workspace, onLog) {
  const dir = path.join(workspace, 'android');
  await fs.mkdir(dir, { recursive: true });
  const www = path.join(dir, 'www');
  await copyDir(project.sourcePath, www);

  const pkg = {
    name: project.appId.split('.').pop().replace(/[^a-zA-Z0-9_-]/g, '') || 'app',
    version: project.version || '1.0.0',
    private: true,
    dependencies: {
      '@capacitor/core': '^7.0.0',
      '@capacitor/android': '^7.0.0',
    },
    devDependencies: {
      '@capacitor/cli': '^7.0.0',
    },
  };
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

  onLog('Capacitor projekt előkészítése…');
  await run('npm', ['install', '--no-audit', '--no-fund'], dir, onLog);
  await run('npx', ['cap', 'init', project.name, project.appId, '--web-dir', 'www'], dir, onLog);
  onLog('Android platform hozzáadása…');
  await run('npx', ['cap', 'add', 'android'], dir, onLog);
  await run('npx', ['cap', 'sync', 'android'], dir, onLog);

  const androidDir = path.join(dir, 'android');
  onLog('Gradle fordítás (assembleDebug)…');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  if (process.platform !== 'win32') {
    await fs.chmod(path.join(androidDir, 'gradlew'), 0o755);
  }
  await run(gradlew, ['assembleDebug', '--no-daemon'], androidDir, onLog);

  const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  await fs.access(apk);
  return apk;
}

export async function runBuild({ project, target, workspace, onLog }) {
  if (target === 'windows') return buildWindows(project, workspace, onLog);
  if (target === 'android') return buildAndroid(project, workspace, onLog);
  throw new Error(`Ismeretlen cél: ${target}`);
}

export function sampleProjectDir() {
  return path.join(ROOT, 'samples', 'hello-web');
}
