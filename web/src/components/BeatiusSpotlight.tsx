import { Check, Download, ExternalLink, Music, ThumbsUp, Coffee } from 'lucide-react';
import { BEATIUS } from '../config';

/**
 * A készítő másik termékének bemutató blokkja.
 *
 * Ez NEM hirdetés: saját projekt, saját oldalon. Ezért nincs „Hirdetés” címke,
 * és nem tölt be semmilyen külső szkriptet.
 */
export default function BeatiusSpotlight() {
  return (
    <section className="beatius card" style={{ ['--beatius-accent' as string]: BEATIUS.accent }}>
      <div className="beatius-head">
        <span className="beatius-mark" aria-hidden="true"><Music size={22} /></span>
        <div>
          <span className="eyebrow">A készítő másik appja</span>
          <h3>{BEATIUS.name}</h3>
          <p className="beatius-tagline">{BEATIUS.tagline}</p>
        </div>
      </div>

      <p className="muted">{BEATIUS.description}</p>

      <ul className="beatius-features">
        {BEATIUS.features.map(f => (
          <li key={f}><Check size={14} /> {f}</li>
        ))}
      </ul>

      <p className="beatius-platform">{BEATIUS.platform}</p>
      <p className="muted small">{BEATIUS.note}</p>

      <div className="beatius-actions">
        <a className="btn primary" href={BEATIUS.links.download} target="_blank" rel="noopener noreferrer">
          <Download size={16} /> Letöltés itch.io-ról
        </a>
        <a className="btn ghost" href={BEATIUS.links.producthunt} target="_blank" rel="noopener noreferrer">
          <ThumbsUp size={15} /> Product Hunt
        </a>
        <a className="btn ghost" href={BEATIUS.links.kofiProfile} target="_blank" rel="noopener noreferrer">
          <Coffee size={15} /> Ko-fi
        </a>
        <a className="beatius-source" href={BEATIUS.links.source} target="_blank" rel="noopener noreferrer">
          Forráskód <ExternalLink size={12} />
        </a>
      </div>

      <p className="muted small">
        Az itch.io-n „name your own price” — vagyis nulla is lehet. A fizetés nem feltétele a letöltésnek.
      </p>
    </section>
  );
}
