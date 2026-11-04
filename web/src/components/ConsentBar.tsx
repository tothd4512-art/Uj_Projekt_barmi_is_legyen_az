import { Cookie, ShieldCheck } from 'lucide-react';
import { ADS, type Consent } from '../config';

/**
 * Hozzájáruló sáv.
 *
 * Mobilon a teljes mondat a képernyő harmadát megette, ezért ott tömör szöveg
 * és rövid gombfelirat jelenik meg, „Részletek” linkkel az adatvédelmi oldalra.
 * A teljes szöveg asztali nézetben és az adatvédelmi oldalon olvasható.
 *
 * FIGYELEM: ez nem Google-tanúsított CMP. Ha EGT-forgalomra kapcsolsz AdSense-t,
 * a Funding Choices kell helyette.
 */
export default function ConsentBar({
  consent,
  onDecide,
}: {
  consent: Consent;
  onDecide: (value: 'granted' | 'denied') => void;
}) {
  if (consent) return null;

  const long = ADS.client
    ? 'A webes oldalon hirdetés lehet. A személyre szabott hirdetéshez hozzájárulás kell; elutasítás esetén csak saját, tracker nélküli ajánlót látsz.'
    : 'Ez az oldal most csak saját ajánlót mutat, külső hirdető és tracker nélkül. Ha később hirdetőhálózatot kapcsolok be, itt fogsz tudni dönteni.';

  const short = ADS.client
    ? 'Személyre szabott hirdetéshez hozzájárulás kell.'
    : 'Csak saját ajánló, külső tracker nélkül.';

  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Hirdetési hozzájárulás">
      <div className="consent-inner">
        <div className="consent-text">
          <Cookie size={18} />
          <p>
            <span className="consent-long">{long} Az asztali Creaft appban nincs és nem is lesz reklám.</span>
            <span className="consent-short">
              {short} Az app reklámmentes.{' '}
              <a href="#/adatvedelem">Részletek</a>
            </span>
          </p>
        </div>
        <div className="consent-actions">
          <button className="btn ghost" onClick={() => onDecide('denied')}>
            <ShieldCheck size={15} />
            <span className="consent-long">Csak saját ajánló</span>
            <span className="consent-short">Elutasítom</span>
          </button>
          <button className="btn primary" onClick={() => onDecide('granted')}>
            <span className="consent-long">Rendben, jöhet hirdetés</span>
            <span className="consent-short">Engedélyezem</span>
          </button>
        </div>
      </div>
    </div>
  );
}
