import { ExternalLink } from 'lucide-react';
import { PROFILES } from '../config';

export default function Profiles() {
  const visible = PROFILES.filter(p => p.url || p.key === 'producthunt' || p.key === 'kofi' || p.key === 'itchio');

  return (
    <div className="profile-grid">
      {visible.map(p => {
        const active = Boolean(p.url);
        const inner = (
          <>
            <div className="profile-top">
              <span className="profile-avatar" style={{ background: p.accent }}>{p.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <strong>{p.name}</strong>
                <div className="muted small">{p.label}</div>
              </div>
            </div>
            <p className="muted small">{p.description}</p>
            <span className={`profile-cta ${active ? '' : 'soon'}`}>
              {p.cta} {active && <ExternalLink size={13} />}
            </span>
          </>
        );

        return active ? (
          <a
            key={p.key}
            className="profile-card card"
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ['--profile-accent' as string]: p.accent }}
          >
            {inner}
          </a>
        ) : (
          <div key={p.key} className="profile-card card is-soon" style={{ ['--profile-accent' as string]: p.accent }}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
