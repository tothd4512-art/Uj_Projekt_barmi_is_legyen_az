import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, FileArchive, FolderOpen, Hammer,
  LayoutDashboard, Loader2, Monitor, Package, Pencil, Play, Plus, Save,
  Settings, Smartphone, Square, Trash2, Upload, X, XCircle,
} from 'lucide-react';
import { api, isDesktop } from './api';
import type { Artifact, Environment, Health, Job, Project, Target } from './types';

type Page = 'overview' | 'build' | 'artifacts' | 'environment';

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: Job['status'] }) {
  const map = {
    running: { label: 'Folyamatban', cls: 'running', Icon: Loader2 },
    succeeded: { label: 'Elkészült', cls: 'ok', Icon: CheckCircle2 },
    failed: { label: 'Sikertelen', cls: 'err', Icon: XCircle },
    cancelled: { label: 'Megszakítva', cls: 'warn', Icon: AlertTriangle },
  } as const;
  const { label, cls, Icon } = map[status];
  return <span className={`badge ${cls}`}><Icon size={14} className={status === 'running' ? 'spin' : ''} />{label}</span>;
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [env, setEnv] = useState<Environment | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [page, setPage] = useState<Page>('overview');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('windows');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', appId: '', version: '', description: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find(p => p.id === selectedId) || null;
  const activeJob = jobs.find(j => j.id === activeJobId) || null;
  const demo = health?.demoMode ?? false;

  const notify = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const loadAll = useCallback(async () => {
    const [h, e, p, j, a] = await Promise.all([
      api.health(), api.environment(), api.projects(), api.jobs(), api.artifacts(),
    ]);
    setHealth(h); setEnv(e); setProjects(p); setJobs(j); setArtifacts(a);
    setSelectedId(prev => prev || p[0]?.id || null);
  }, []);

  useEffect(() => { loadAll().catch(err => notify(err.message, 'err')); }, [loadAll, notify]);

  useEffect(() => {
    const t = window.setInterval(() => {
      api.jobs().then(setJobs).catch(() => {});
      api.artifacts().then(setArtifacts).catch(() => {});
    }, 1500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      setForm({
        name: selectedProject.name,
        appId: selectedProject.appId,
        version: selectedProject.version,
        description: selectedProject.description,
      });
    }
  }, [selectedProject]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [activeJob?.logs.length]);

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (demo) return notify('Előnézeti módban a projektimport le van tiltva.', 'err');
    setBusy(true);
    try {
      const project = await api.importZip(file, file.name.replace(/\.zip$/i, ''));
      await loadAll();
      setSelectedId(project.id);
      setPage('build');
      notify('Projekt importálva.');
    } catch (err) {
      notify((err as Error).message, 'err');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleImportDialog() {
    if (demo) return notify('Előnézeti módban a projektimport le van tiltva.', 'err');
    setBusy(true);
    try {
      const project = await api.importZipDialog();
      if (!project) return;
      await loadAll();
      setSelectedId(project.id);
      setPage('build');
      notify('Projekt importálva.');
    } catch (err) {
      notify((err as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(artifact: Artifact) {
    try {
      const saved = await api.downloadArtifact(artifact);
      if (saved) notify(isDesktop ? 'Fájl mentve.' : 'Letöltés elindítva.');
    } catch (err) {
      notify((err as Error).message, 'err');
    }
  }

  async function handleSample() {
    if (demo) return notify('Előnézeti módban a projektkészítés le van tiltva.', 'err');
    setBusy(true);
    try {
      const project = await api.createSample();
      await loadAll();
      setSelectedId(project.id);
      setPage('build');
      notify('Mintaprojekt létrehozva.');
    } catch (err) { notify((err as Error).message, 'err'); }
    finally { setBusy(false); }
  }

  async function handleSave() {
    if (!selectedProject) return;
    if (demo) return notify('Előnézeti módban a mentés le van tiltva.', 'err');
    try {
      await api.updateProject(selectedProject.id, form);
      await loadAll();
      setEditing(false);
      notify('Beállítások mentve.');
    } catch (err) { notify((err as Error).message, 'err'); }
  }

  async function handleDelete(id: string) {
    if (demo) return notify('Előnézeti módban a törlés le van tiltva.', 'err');
    if (!window.confirm('Biztosan törlöd a projektet?')) return;
    try {
      await api.deleteProject(id);
      if (selectedId === id) setSelectedId(null);
      await loadAll();
      notify('Projekt törölve.');
    } catch (err) { notify((err as Error).message, 'err'); }
  }

  async function handleBuild() {
    if (!selectedProject) return;
    if (demo) return notify('Ez böngészős előnézet. A valódi fordítás az asztali appban fut.', 'err');
    setBusy(true);
    try {
      const job = await api.build(selectedProject.id, target);
      setActiveJobId(job.id);
      setPage('build');
      await loadAll();
      notify('Fordítás elindult.');
    } catch (err) { notify((err as Error).message, 'err'); }
    finally { setBusy(false); }
  }

  async function handleCancel() {
    if (!activeJob) return;
    try { await api.cancel(activeJob.id); await loadAll(); }
    catch (err) { notify((err as Error).message, 'err'); }
  }

  const runningCount = jobs.filter(j => j.status === 'running').length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Hammer size={22} /></div>
          <div>
            <div className="brand-name">Creaft</div>
            <div className="brand-sub">Creative + Craft</div>
          </div>
        </div>
        <nav>
          <button className={page === 'overview' ? 'active' : ''} onClick={() => setPage('overview')}>
            <LayoutDashboard size={18} /> Áttekintés
          </button>
          <button className={page === 'build' ? 'active' : ''} onClick={() => setPage('build')}>
            <Hammer size={18} /> Fordítás
          </button>
          <button className={page === 'artifacts' ? 'active' : ''} onClick={() => setPage('artifacts')}>
            <Package size={18} /> Elkészült fájlok
            {artifacts.length > 0 && <span className="nav-count">{artifacts.length}</span>}
          </button>
          <button className={page === 'environment' ? 'active' : ''} onClick={() => setPage('environment')}>
            <Settings size={18} /> Környezet
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="pill"><span className="dot ok" /> Reklámmentes</div>
          <div className="pill"><span className="dot ok" /> Nincs fiók</div>
          <div className="pill"><span className="dot ok" /> Nincs előfizetés</div>
          <div className="pill"><span className="dot ok" /> Közvetlen letöltés</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{page === 'overview' ? 'Áttekintés' : page === 'build' ? 'Fordítás' : page === 'artifacts' ? 'Elkészült fájlok' : 'Környezet'}</h1>
            <p className="muted">
              {page === 'overview' && 'Projektjeid és gyors állapotjelentés.'}
              {page === 'build' && 'Válassz célt, indítsd a fordítást, kövesd a naplót.'}
              {page === 'artifacts' && 'Minden elkészült csomag közvetlenül letölthető.'}
              {page === 'environment' && 'A háttérben dolgozó fordítóeszközök állapota.'}
            </p>
          </div>
          {demo && <span className="badge warn"><AlertTriangle size={14} /> Böngészős előnézet</span>}
          {!demo && isDesktop && <span className="badge ok"><CheckCircle2 size={14} /> Tauri asztali app</span>}
        </header>

        {page === 'overview' && (
          <div className="page">
            <div className="stats">
              <div className="stat card"><div className="stat-label">Projektek</div><div className="stat-value">{projects.length}</div></div>
              <div className="stat card"><div className="stat-label">Elkészült fájlok</div><div className="stat-value">{artifacts.length}</div></div>
              <div className="stat card"><div className="stat-label">Futó fordítás</div><div className="stat-value">{runningCount}</div></div>
            </div>

            <div className="section-head">
              <h2>Projektek</h2>
              <div className="row">
                <button className="btn ghost" onClick={handleSample} disabled={busy || demo}><Plus size={16} /> Mintaprojekt</button>
                <button className="btn primary" onClick={() => (isDesktop ? handleImportDialog() : fileRef.current?.click())} disabled={busy || demo}><Upload size={16} /> ZIP importálása</button>
                {!isDesktop && <input ref={fileRef} type="file" accept=".zip" hidden onChange={handleImport} />}
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="empty card">
                <FolderOpen size={36} />
                <p>Még nincs projekt. Hozz létre egy mintát vagy importálj egy webapp ZIP-et.</p>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map(p => (
                  <div key={p.id} className="project-card card" onClick={() => { setSelectedId(p.id); setPage('build'); }}>
                    <div className="project-icon"><FileArchive size={22} /></div>
                    <div className="project-body">
                      <div className="project-name">{p.name}</div>
                      <div className="muted small">{p.appId}</div>
                      <div className="muted small">v{p.version}</div>
                    </div>
                    <button className="icon-btn danger" title="Törlés" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === 'build' && (
          <div className="page">
            {!selectedProject ? (
              <div className="empty card"><FolderOpen size={36} /><p>Válassz projektet az áttekintésben.</p></div>
            ) : (
              <>
                <div className="card project-header">
                  <div>
                    {editing ? (
                      <div className="form-grid">
                        <label>Név<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                        <label>Csomagazonosító<input value={form.appId} onChange={e => setForm({ ...form, appId: e.target.value })} /></label>
                        <label>Verzió<input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></label>
                        <label>Leírás<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
                      </div>
                    ) : (
                      <>
                        <h2>{selectedProject.name}</h2>
                        <div className="muted small">{selectedProject.appId} · v{selectedProject.version}</div>
                        {selectedProject.description && <p className="muted">{selectedProject.description}</p>}
                      </>
                    )}
                  </div>
                  <div className="row">
                    {editing ? (
                      <>
                        <button className="btn primary" onClick={handleSave}><Save size={16} /> Mentés</button>
                        <button className="btn ghost" onClick={() => setEditing(false)}><X size={16} /> Mégse</button>
                      </>
                    ) : (
                      <button className="btn ghost" onClick={() => setEditing(true)} disabled={demo}><Pencil size={16} /> Szerkesztés</button>
                    )}
                  </div>
                </div>

                <div className="target-grid">
                  <button className={`target-card card ${target === 'windows' ? 'selected' : ''}`} onClick={() => setTarget('windows')}>
                    <Monitor size={28} />
                    <div><strong>Windows EXE</strong><div className="muted small">Hordozható asztali csomag</div></div>
                    {env && !env.canBuildWindows && <span className="badge warn">Wine/Windows kellhet</span>}
                  </button>
                  <button className={`target-card card ${target === 'android' ? 'selected' : ''}`} onClick={() => setTarget('android')}>
                    <Smartphone size={28} />
                    <div><strong>Android APK</strong><div className="muted small">Telepíthető androidos csomag</div></div>
                    {env && !env.canBuildAndroid && <span className="badge warn">Java + Android SDK kell</span>}
                  </button>
                </div>

                <div className="row build-actions">
                  <button className="btn primary big" onClick={handleBuild} disabled={busy || demo || activeJob?.status === 'running'}>
                    <Play size={18} /> Fordítás indítása
                  </button>
                  {activeJob?.status === 'running' && (
                    <button className="btn ghost" onClick={handleCancel}><Square size={16} /> Megszakítás</button>
                  )}
                  {demo && <span className="muted small">A valódi fordítás az asztali appban érhető el.</span>}
                </div>

                {activeJob && (
                  <div className="card log-card">
                    <div className="log-head">
                      <div className="row">
                        {activeJob.target === 'windows' ? <Monitor size={16} /> : <Smartphone size={16} />}
                        <strong>{activeJob.projectName}</strong>
                        <StatusBadge status={activeJob.status} />
                      </div>
                      {activeJob.artifactId && (() => {
                        const artifact = artifacts.find(a => a.id === activeJob.artifactId);
                        return artifact ? (
                          <button className="btn primary" onClick={() => handleDownload(artifact)}>
                            <Download size={16} /> {isDesktop ? 'Mentés' : 'Letöltés'}
                          </button>
                        ) : null;
                      })()}
                    </div>
                    <div className="log" ref={logRef}>
                      {activeJob.logs.map((l, i) => <div key={i} className="log-line">{l.line}</div>)}
                      {activeJob.status === 'running' && <div className="log-line dim">Várakozás a fordítóra…</div>}
                    </div>
                    {activeJob.error && <div className="error-box"><XCircle size={16} /> {activeJob.error}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {page === 'artifacts' && (
          <div className="page">
            {artifacts.length === 0 ? (
              <div className="empty card"><Package size={36} /><p>Még nincs elkészült fájl. Indíts egy fordítást.</p></div>
            ) : (
              <div className="card table-card">
                <table>
                  <thead><tr><th>Fájl</th><th>Cél</th><th>Méret</th><th>Dátum</th><th></th></tr></thead>
                  <tbody>
                    {artifacts.map(a => (
                      <tr key={a.id}>
                        <td><div className="row"><FileArchive size={16} /> {a.name}</div></td>
                        <td>{a.target === 'windows' ? 'Windows EXE' : 'Android APK'}</td>
                        <td>{formatBytes(a.size)}</td>
                        <td className="muted small">{new Date(a.createdAt).toLocaleString('hu-HU')}</td>
                        <td><button className="btn ghost" onClick={() => handleDownload(a)}><Download size={16} /> {isDesktop ? 'Mentés' : 'Letöltés'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {page === 'environment' && env && (
          <div className="page">
            <div className="env-grid">
              <EnvCard title="Node.js" ok={!!env.node} detail={env.node} />
              <EnvCard title="npm" ok={env.npm} detail={env.npm ? 'Elérhető' : 'Nem található'} />
              <EnvCard title="Java" ok={env.java} detail={env.javaVersion || (env.java ? 'Elérhető' : 'Nem található')} />
              <EnvCard title="Android SDK" ok={env.androidSdk} detail={env.androidHome || (env.androidSdk ? 'Elérhető' : 'ANDROID_HOME nincs beállítva')} />
              <EnvCard title="Windows fordítás" ok={env.canBuildWindows} detail={env.canBuildWindows ? 'Elérhető' : 'Windows vagy Wine szükséges'} />
              <EnvCard title="Android fordítás" ok={env.canBuildAndroid} detail={env.canBuildAndroid ? 'Elérhető' : 'Java és Android SDK szükséges'} />
            </div>
            <div className="card note">
              <h3>Hogyan lesz valódi APK / EXE?</h3>
              <ul>
                <li><strong>Windows EXE:</strong> Electron + electron-builder. Windows gépen natívan, Linuxon Wine-nal vagy CI-ban.</li>
                <li><strong>Android APK:</strong> Capacitor + Gradle. Java 17+ és Android SDK szükséges.</li>
                <li>A program nem színlel sikert: ha hiányzik eszköz, a naplóban és a környezeti kártyákon látod.</li>
                <li>Aláírás nélkül a rendszer figyelmeztethet; a fájlt ettől még elkészíti.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {toast && <div className={`toast ${toast.kind}`}>{toast.kind === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{toast.msg}</div>}
    </div>
  );
}

function EnvCard({ title, ok, detail }: { title: string; ok: boolean; detail: string }) {
  return (
    <div className="card env-card">
      <div className="row">
        {ok ? <CheckCircle2 size={18} className="ok-text" /> : <AlertTriangle size={18} className="warn-text" />}
        <strong>{title}</strong>
      </div>
      <div className="muted small">{detail}</div>
    </div>
  );
}
