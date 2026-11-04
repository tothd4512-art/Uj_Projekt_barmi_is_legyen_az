import { useEffect, useState } from 'react';
import {
  ArrowRight, Ban, Code2, Download, Github, Hammer, Heart,
  Monitor, Package, ShieldCheck, Smartphone, Sparkles, WifiOff, Zap,
} from 'lucide-react';
import AdSlot from './components/AdSlot';
import ConsentBar from './components/ConsentBar';
import Demo from './components/Demo';
import Profiles from './components/Profiles';
import BeatiusSpotlight from './components/BeatiusSpotlight';
import { BRAND, LATEST_RELEASE, REPO, RELEASES, readConsent, writeConsent, type Consent } from './config';

type Route = 'home' | 'profiles' | 'privacy';

function currentRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'profilok') return 'profiles';
  if (h === 'adatvedelem') return 'privacy';
  return 'home';
}

export default function Site() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [consent, setConsent] = useState<Consent>(() => readConsent());

  useEffect(() => {
    const onHash = () => { setRoute(currentRoute()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function decide(value: 'granted' | 'denied') {
    writeConsent(value);
    setConsent(value);
  }

  return (
    <div className="site">
      <header className="site-nav">
        <a className="logo" href="#/">
          <span className="logo-mark"><Hammer size={18} /></span>
          <span>
            <strong>{BRAND.name}</strong>
            <small>{BRAND.tagline}</small>
          </span>
        </a>
        <nav>
          <a className={route === 'home' ? 'active' : ''} href="#/">Bemutató</a>
          <a className={route === 'profiles' ? 'active' : ''} href="#/profilok">Alkotások</a>
          <a href={RELEASES} target="_blank" rel="noopener noreferrer">Kiadások</a>
          <a className="nav-cta" href={LATEST_RELEASE} target="_blank" rel="noopener noreferrer">
            <Download size={15} /> Letöltés
          </a>
        </nav>
      </header>

      {route === 'home' && (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow"><Sparkles size={13} /> {BRAND.tagline} · v{BRAND.version}</span>
              <h1>A webes appodból <span className="grad">valódi APK és EXE</span>.</h1>
              <p className="lead">
                A Creaft egy grafikus asztali app: behúzod a webes projekted ZIP-jét, beállítod a nevét és
                verzióját, és a saját gépeden készül el az Android APK vagy a Windows EXE.
              </p>
              <div className="hero-actions">
                <a className="btn primary big" href={LATEST_RELEASE} target="_blank" rel="noopener noreferrer">
                  <Download size={18} /> Letöltés Windowsra
                </a>
                <a className="btn ghost big" href="#/profilok">Alkotások <ArrowRight size={16} /></a>
              </div>
              <ul className="hero-facts">
                <li><Ban size={14} /> Nincs fiók</li>
                <li><Ban size={14} /> Nincs várólista</li>
                <li><Ban size={14} /> Nincs fizetős letöltés</li>
                <li><ShieldCheck size={14} /> Az asztali app reklámmentes</li>
              </ul>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="mock-window">
                <div className="mock-bar"><i /><i /><i /><span>Creaft</span></div>
                <div className="mock-body">
                  <div className="mock-row"><Package size={15} /> hello-web.zip <span className="ok-text">kész</span></div>
                  <div className="mock-targets">
                    <div className="mock-target active"><Monitor size={17} /> EXE</div>
                    <div className="mock-target"><Smartphone size={17} /> APK</div>
                  </div>
                  <div className="mock-log">
                    <div>Projekt ellenőrzése…</div>
                    <div>electron-builder --win portable</div>
                    <div>Erőforrások csomagolása…</div>
                    <div className="ok-text">Kész: Hello-Creaft-1.0.0.exe</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="container"><AdSlot slot="hero" consent={consent} /></div>

          <section className="container section">
            <h2>Miért pont ez?</h2>
            <p className="muted">A legtöbb online építő e-mailt kér, sorba állít, vagy a végén fizettet a saját fájlodért. Itt nem ez megy.</p>
            <div className="feature-grid">
              <Feature Icon={WifiOff} title="Helyben fut" text="A fordítás a te gépeden történik. A forrásod nem megy fel sehova." />
              <Feature Icon={Zap} title="Valódi napló" text="Nem színlelt siker: látod a valódi fordítási kimenetet, a hibával együtt." />
              <Feature Icon={Package} title="Közvetlen fájl" text="Amint kész, menthető. Nincs e-mail, nincs kód, nincs előfizetés." />
              <Feature Icon={ShieldCheck} title="Reklám nélkül" text="Az asztali appban egy szál hirdetés sincs. A hirdetés csak ez a weboldal." />
              <Feature Icon={Code2} title="Nyílt forrás" text="A teljes kód a GitHubon van, ellenőrizhető és módosítható." />
              <Feature Icon={Heart} title="Támogatható, nem kizárt" text="Ha tetszik, támogathatsz — de a letöltés sosem lesz fizetős kapu mögött." />
            </div>
          </section>

          <section className="container section" id="demo">
            <h2>Nézd meg működés közben</h2>
            <p className="muted">Ez a böngészős demó megmutatja a folyamatot. Valódi fájlt az asztali app készít.</p>
            <Demo />
          </section>

          <div className="container"><AdSlot slot="inline" consent={consent} variant="card" /></div>

          <section className="container section">
            <h2>Három lépés</h2>
            <div className="steps">
              <Step n={1} title="Húzd be a ZIP-et" text="Elég egy index.html a gyökérben vagy egy almappában." />
              <Step n={2} title="Állítsd be" text="Név, csomagazonosító, verzió — majd EXE vagy APK." />
              <Step n={3} title="Mentsd el" text="A kész fájl közvetlenül a gépedre kerül, aláírás nélkül is." />
            </div>
            <div className="note card">
              <strong>Mire van szükség a valódi fordításhoz?</strong>
              <ul>
                <li><strong>EXE:</strong> Node.js, és Windows (Linuxon Wine vagy CI).</li>
                <li><strong>APK:</strong> Node.js + Java 17+ és Android SDK.</li>
                <li>Aláírás nélkül a rendszer figyelmeztethet — ezt nem kerüljük meg.</li>
              </ul>
            </div>
          </section>

          <section className="container section">
            <div className="section-head">
              <h2>Alkotások</h2>
              <a className="btn ghost" href="#/profilok">Összes <ArrowRight size={15} /></a>
            </div>
            <p className="muted">Ugyanaz a kéz készíti a Creaftot és a BEATIUS zenelejátszót is.</p>
            <BeatiusSpotlight />
            <Profiles />
          </section>

          <section className="container section">
            <h2>Gyakori kérdések</h2>
            <div className="faq">
              <Faq q="Tényleg nincs reklám az appban?">
                Igen. A hirdetés kizárólag ezen a weboldalon jelenik meg. Az asztali Creaft nem tölt be
                hirdetőhálózatot, és nem is fog.
              </Faq>
              <Faq q="Feltölti a forrásomat?">
                Nem. Az asztali app a helyi fájlrendszerben dolgozik, a fordítás a gépeden fut.
                Ez a weboldal sem kér fájlt: a demó csak szimuláció.
              </Faq>
              <Faq q="Bármilyen EXE-ből lesz APK?">
                Nem. A Creaft webes forrásból (HTML/CSS/JS) készít APK-t és EXE-t. Egy meglévő
                natív Windows programot nem alakít át androidos appá.
              </Faq>
              <Faq q="Miért figyelmeztet a Windows?">
                Mert a csomag nincs kódaláírva. A tanúsítvány pénzbe kerül; amíg nincs, a figyelmeztetés
                jogos, és nem kerüljük meg.
              </Faq>
              <Faq q="Mibe kerül?">
                A Creaft letöltése és használata ingyenes, a forráskód is nyílt. A támogatás önkéntes,
                és nem nyit fel semmilyen funkciót. A fenti Ko-fi- és itch.io-linkek a másik appomhoz,
                a BEATIUS-hoz vezetnek.
              </Faq>
            </div>
          </section>

          <section className="container section cta-final">
            <h2>Kész vagy? Induljon a Creaft.</h2>
            <p className="muted">Töltsd le, és készítsd el az első csomagodat a saját gépeden.</p>
            <div className="hero-actions center">
              <a className="btn primary big" href={LATEST_RELEASE} target="_blank" rel="noopener noreferrer">
                <Download size={18} /> Letöltés
              </a>
              <a className="btn ghost big" href={REPO} target="_blank" rel="noopener noreferrer">
                <Github size={17} /> Forráskód
              </a>
            </div>
          </section>

          <div className="container"><AdSlot slot="footer" consent={consent} /></div>
        </main>
      )}

      {route === 'profiles' && (
        <main className="container section">
          <h1>Alkotások és profilok</h1>
          <p className="muted">
            A Creaft mellett ezek a saját projektek és felületek. A Product Hunt-, Ko-fi- és itch.io-lap
            a BEATIUS zenelejátszóé — a Creaftnak még nincs külön launchja.
          </p>
          <BeatiusSpotlight />
          <Profiles />
          <div className="spacer" />
          <AdSlot slot="inline" consent={consent} variant="card" />
          <div className="spacer" />
          <a className="btn ghost" href="#/">Vissza a bemutatóhoz</a>
        </main>
      )}

      {route === 'privacy' && (
        <main className="container section prose">
          <h1>Adatvédelem és hirdetés</h1>
          <p>
            Ez az oldal a Creaft bemutató oldala. Nem kér regisztrációt, és nem kér e-mail címet.
            A böngészős demó nem tölt fel fájlt, és nem futtat fordítást.
          </p>
          <h2>Hirdetés</h2>
          <p>
            Az oldalon ajánló vagy hirdetés jelenhet meg. Alapértelmezés szerint <strong>saját ajánló</strong>:
            a készítő saját projektjeit ajánlja, külső hirdetőhálózat és követőkód nélkül.
            Ha külső hirdetőhálózat (pl. Google AdSense) aktív, az csak a hozzájárulásod után tölt be.
          </p>
          <p>
            A hozzájárulást a böngésződ helyi tárolójában jegyezzük meg (<code>creaft.ads.consent</code>),
            és bármikor törölheted a böngésző adatainak törlésével.
          </p>
          <h2>Asztali alkalmazás</h2>
          <p>
            A letölthető Creaft asztali app <strong>nem tartalmaz hirdetést</strong>, nem küld
            telemetriát, és a projektjeidet a helyi gépeden tárolja.
          </p>
          <h2>Kapcsolat</h2>
          <p>
            Kérdés vagy hiba esetén a <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub repóban</a> tudsz írni.
          </p>
          <button className="btn ghost" onClick={() => { writeConsent('denied'); setConsent('denied'); }}>
            Hirdetési hozzájárulás visszavonása
          </button>
        </main>
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>{BRAND.name}</strong> — {BRAND.tagline}
            <div className="muted small">Az asztali app reklámmentes. A weboldal hirdetést tartalmazhat.</div>
          </div>
          <div className="footer-links">
            <a href="#/profilok">Alkotások</a>
            <a href="#/adatvedelem">Adatvédelem</a>
            <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
        </div>
      </footer>

      <ConsentBar consent={consent} onDecide={decide} />
    </div>
  );
}

function Feature({ Icon, title, text }: { Icon: typeof Zap; title: string; text: string }) {
  return (
    <div className="feature card">
      <span className="feature-icon"><Icon size={18} /></span>
      <strong>{title}</strong>
      <p className="muted small">{text}</p>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="step card">
      <span className="step-n">{n}</span>
      <strong>{title}</strong>
      <p className="muted small">{text}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item card ${open ? 'open' : ''}`}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-sign">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="muted small">{children}</p>}
    </div>
  );
}


