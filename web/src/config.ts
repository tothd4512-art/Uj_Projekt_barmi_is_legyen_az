/**
 * Egyetlen hely, ahol a márka, a linkek és a hirdetés beállításai élnek.
 *
 * A hirdetés alapból SAJÁT (house) hirdetés: a saját projektjeidet hirdeti,
 * külső hálózat és tracker nélkül. Ha lesz AdSense fiókod, akkor a
 * VITE_ADSENSE_CLIENT és a VITE_ADSENSE_SLOT_* változókkal élesíthető.
 *
 * Az asztali Creaft app SOHA nem tölt be hirdetést — ez a modul csak a
 * webes csomagban létezik.
 */

export const BRAND = {
  name: 'Creaft',
  tagline: 'Creative + Craft',
  claim: 'A webes appodból valódi APK és EXE.',
  version: '0.3.0',
};

export const REPO = 'https://github.com/tothd4512-art/Uj_Projekt_barmi_is_legyen_az';
export const RELEASES = `${REPO}/releases`;
export const LATEST_RELEASE = `${REPO}/releases/latest`;

/** Kitöltendő profilok. Amit üresen hagysz, az nem jelenik meg — nincs halott link. */
export type ProfileKey = 'beatius' | 'producthunt' | 'kofi' | 'itchio' | 'github';

export interface Profile {
  key: ProfileKey;
  name: string;
  label: string;
  description: string;
  url: string;
  cta: string;
  accent: string;
}

export const PROFILES: Profile[] = [
  {
    key: 'beatius',
    name: 'BEATIUS',
    label: 'Zenelejátszó',
    description:
      'Svájci bicska a zenéhez: FFT-s ritmusvizualizáció, megújult UI, YouTube-keresés és lejátszás FFT-vel, 31 sávos EQ, kedvencek. Csak a kereséshez kell net, a többi offline megy.',
    url: 'https://github.com/tothdani182-lgtm/BEATIUS-mobile',
    cta: 'Megnézem',
    accent: '#a78bfa',
  },
  {
    key: 'github',
    name: 'GitHub',
    label: 'Forráskód',
    description: 'A Creaft teljes forrása, hibajegyek és a kiadások. Nyíltan, letölthetően.',
    url: 'https://github.com/tothd4512-art',
    cta: 'Forráskód',
    accent: '#38bdf8',
  },
  {
    key: 'producthunt',
    name: 'Product Hunt',
    label: 'Launch',
    description: 'Itt tudod támogatni a launchot, hogy több emberhez jusson el a Creaft.',
    url: '',
    cta: 'Hamarosan',
    accent: '#fb923c',
  },
  {
    key: 'kofi',
    name: 'Ko-fi',
    label: 'Támogatás',
    description: 'Ha hasznos volt, egy kávé segít, hogy tovább fejlesszem. Nem feltétele a letöltésnek.',
    url: '',
    cta: 'Hamarosan',
    accent: '#f472b6',
  },
  {
    key: 'itchio',
    name: 'itch.io',
    label: 'Játékok, appok',
    description: 'Az itch.io profilom, ahol az appok és kísérletek is megjelennek.',
    url: '',
    cta: 'Hamarosan',
    accent: '#f87171',
  },
];

export const ADS = {
  /** Ha igaz, a house hirdetések megjelennek. Az asztali appban ez a fájl nem létezik. */
  houseEnabled: true,
  /** AdSense client ID, pl. "ca-pub-1234567890123456". Üres = nincs külső hirdetés. */
  client: (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim() || '',
  slots: {
    hero: (import.meta.env.VITE_ADSENSE_SLOT_HERO as string | undefined)?.trim() || '',
    inline: (import.meta.env.VITE_ADSENSE_SLOT_INLINE as string | undefined)?.trim() || '',
    footer: (import.meta.env.VITE_ADSENSE_SLOT_FOOTER as string | undefined)?.trim() || '',
  },
};

export type AdSlotName = keyof typeof ADS.slots;

/** Külső hirdetés csak akkor, ha a látogató hozzájárult. */
export const CONSENT_KEY = 'creaft.ads.consent';
export type Consent = 'granted' | 'denied' | null;

export function readConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function writeConsent(value: Exclude<Consent, null>) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* privát mód — marad a session szintű döntés */
  }
}

export function adsenseActive(slot: AdSlotName, consent: Consent) {
  return Boolean(ADS.client && ADS.slots[slot] && consent === 'granted');
}
