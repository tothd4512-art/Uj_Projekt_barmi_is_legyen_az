import { Cookie, ShieldCheck } from 'lucide-react';
import { ADS, type Consent } from '../config';

export default function ConsentBar({
  consent,
  onDecide,
}: {
  consent: Consent;
  onDecide: (value: 'granted' | 'denied') => void;
}) {
  if (consent) return null;

  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Hirdetési hozzájárulás">
      <div className="consent-inner">
        <div className="consent-text">
          <Cookie size={18} />
          <p>
            {ADS.client
              ? 'A webes oldalon hirdetés lehet. A személyre szabott hirdetéshez hozzájárulás kell; elutasítás esetén csak saját, tracker nélküli ajánlót látsz.'
              : 'Ez az oldal most csak saját ajánlót mutat, külső hirdető és tracker nélkül. Ha később hirdetőhálózatot kapcsolok be, itt fogsz tudni dönteni.'}
            {' '}Az asztali Creaft appban nincs és nem is lesz reklám.
          </p>
        </div>
        <div className="consent-actions">
          <button className="btn ghost" onClick={() => onDecide('denied')}>
            <ShieldCheck size={15} /> Csak saját ajánló
          </button>
          <button className="btn primary" onClick={() => onDecide('granted')}>Rendben, jöhet hirdetés</button>
        </div>
      </div>
    </div>
  );
}
