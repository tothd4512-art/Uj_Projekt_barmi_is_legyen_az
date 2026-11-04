import { useEffect, useRef } from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { ADS, PROFILES, adsenseActive, type AdSlotName, type Consent, type ProfileKey } from '../config';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptRequested = false;

function ensureAdsenseScript(client: string) {
  if (scriptRequested) return;
  scriptRequested = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

/**
 * Hirdetés hely.
 *
 * 1. Ha van AdSense beállítás ÉS a látogató hozzájárult → valódi AdSense blokk.
 * 2. Egyébként → saját (house) hirdetés a saját projektekről, tracker nélkül.
 *
 * Az asztali Creaft appban ez a komponens nem létezik, ott nincs hirdetés.
 */
export default function AdSlot({
  slot,
  consent,
  variant = 'banner',
}: {
  slot: AdSlotName;
  consent: Consent;
  variant?: 'banner' | 'card';
}) {
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const live = adsenseActive(slot, consent);

  useEffect(() => {
    if (!live) return;
    ensureAdsenseScript(ADS.client);
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blokkoló esetén a house hirdetés marad */
    }
  }, [live]);

  if (live) {
    return (
      <div className={`ad ad-${variant}`} aria-label="Hirdetés">
        <span className="ad-label">Hirdetés</span>
        <ins
          ref={ref}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADS.client}
          data-ad-slot={ADS.slots[slot]}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  if (!ADS.houseEnabled) return null;

  // Saját ajánló: slotonként más cél, hogy ne ugyanazt ismételjük háromszor.
  // A korkapus itch.io-profil helyett mindig a közvetlen terméklapra viszünk.
  const order: ProfileKey[] = slot === 'hero'
    ? ['beatiusweb', 'beatius', 'kofi']
    : slot === 'inline'
      ? ['producthunt', 'beatiusweb', 'beatius']
      : ['kofi', 'beatius', 'producthunt'];
  const pick = order
    .map(key => PROFILES.find(p => p.key === key && p.url))
    .find(Boolean);
  if (!pick) return null;

  return (
    <a
      className={`promo promo-${variant}`}
      href={pick.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ ['--promo-accent' as string]: pick.accent }}
    >
      <span className="promo-label"><Megaphone size={11} /> Saját ajánló</span>
      <div className="promo-body">
        <div className="promo-badge" aria-hidden="true">{pick.name.slice(0, 2).toUpperCase()}</div>
        <div className="promo-copy">
          <strong>{pick.name}</strong>
          <span>{pick.description}</span>
        </div>
        <span className="promo-cta">{pick.cta} <ExternalLink size={14} /></span>
      </div>
    </a>
  );
}
