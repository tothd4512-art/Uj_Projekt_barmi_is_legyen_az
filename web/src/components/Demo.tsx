import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, Loader2, Monitor, Play, Smartphone, Square, Terminal, XCircle, AlertTriangle,
} from 'lucide-react';
import { DOWNLOAD_URL } from '../config';

type Target = 'windows' | 'android';
type Phase = 'idle' | 'running' | 'done';

const SCRIPT: Record<Target, string[]> = {
  windows: [
    'Creaft demo · szimulált fordítási napló',
    'Projekt ellenőrzése: index.html megvan',
    'Ideiglenes munkakönyvtár létrehozása',
    'Electron 33 előkészítése (csak a demóban szimulálva)',
    'electron-builder --win portable --x64',
    'Erőforrások csomagolása: app.asar',
    'Ikon és verzióinfó beágyazása',
    'Hordozható EXE írása',
    'Kész: Hello-Creaft-1.0.0-windows.exe',
  ],
  android: [
    'Creaft demo · szimulált fordítási napló',
    'Projekt ellenőrzése: index.html megvan',
    'Capacitor 7 projekt előkészítése',
    'cap init / cap add android (szimulálva)',
    'Webes forrás másolása: cap sync',
    'gradlew assembleDebug --no-daemon',
    'Erőforrások és dex összefűzése',
    'APK igazítása és debug aláírás',
    'Kész: Hello-Creaft-1.0.0-android.apk',
  ],
};

/**
 * Böngészős DEMO. Nem futtat fordítót, nem tölt fel semmit, nem kér fájlt.
 * A valódi APK/EXE készítés az asztali Creaft appban történik.
 */
export default function Demo() {
  const [target, setTarget] = useState<Target>('windows');
  const [phase, setPhase] = useState<Phase>('idle');
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);

  const script = useMemo(() => SCRIPT[target], [target]);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines]);

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  }

  function start() {
    stop();
    setLines([]);
    setProgress(0);
    setPhase('running');
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setLines(script.slice(0, i));
      setProgress(Math.round((i / script.length) * 100));
      if (i >= script.length) {
        stop();
        setPhase('done');
      }
    }, 520);
  }

  function cancel() {
    stop();
    setPhase('idle');
    setLines(prev => [...prev, 'Megszakítva.']);
  }

  const fileName = `Hello-Creaft-1.0.0-${target}.${target === 'windows' ? 'exe' : 'apk'}`;

  return (
    <div className="demo card">
      <div className="demo-head">
        <div>
          <h3>Próbáld ki böngészőben</h3>
          <p className="muted small">
            Ez szimulált napló, hogy lásd a folyamatot. Semmit nem tölt fel, és nem kér fájlt tőled.
          </p>
        </div>
        <span className="badge warn"><AlertTriangle size={13} /> Demó</span>
      </div>

      <div className="demo-targets">
        <button
          className={`demo-target ${target === 'windows' ? 'selected' : ''}`}
          onClick={() => { setTarget('windows'); setPhase('idle'); setLines([]); setProgress(0); stop(); }}
          disabled={phase === 'running'}
        >
          <Monitor size={22} />
          <span><strong>Windows EXE</strong><small>Electron + electron-builder</small></span>
        </button>
        <button
          className={`demo-target ${target === 'android' ? 'selected' : ''}`}
          onClick={() => { setTarget('android'); setPhase('idle'); setLines([]); setProgress(0); stop(); }}
          disabled={phase === 'running'}
        >
          <Smartphone size={22} />
          <span><strong>Android APK</strong><small>Capacitor + Gradle</small></span>
        </button>
      </div>

      <div className="demo-actions">
        {phase === 'running' ? (
          <button className="btn ghost" onClick={cancel}><Square size={15} /> Megszakítás</button>
        ) : (
          <button className="btn primary" onClick={start}><Play size={16} /> Demó fordítás</button>
        )}
        <div className="progress" aria-label="Folyamat">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="muted small">{progress}%</span>
      </div>

      <div className="demo-log" ref={logRef}>
        <div className="demo-log-head"><Terminal size={14} /> build.log</div>
        {lines.length === 0
          ? <div className="log-line dim">Indítsd el a demót, és itt fut a napló…</div>
          : lines.map((l, i) => <div className="log-line" key={i}>{l}</div>)}
        {phase === 'running' && <div className="log-line dim"><Loader2 size={12} className="spin" /> dolgozik…</div>}
      </div>

      {phase === 'done' && (
        <div className="demo-result">
          <div className="row">
            <CheckCircle2 size={18} className="ok-text" />
            <strong>{fileName}</strong>
            <span className="badge">demó eredmény</span>
          </div>
          <p className="muted small">
            A böngésző nem készít valódi APK/EXE fájlt — ehhez fordítóeszközök kellenek a gépeden.
            A valódi fájl az asztali Creaft appban készül el, reklám nélkül.
          </p>
          <a className="btn primary" href={DOWNLOAD_URL}>Letöltöm az asztali appot</a>
        </div>
      )}

      {phase === 'idle' && lines.length > 0 && (
        <div className="demo-result muted small"><XCircle size={14} /> A demó megszakadt. Újra indíthatod.</div>
      )}
    </div>
  );
}
