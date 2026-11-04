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

/**
 * A készítő másik kész terméke. A weboldalon ez a keresztajánlás alanya.
 *
 * FIGYELEM: a Product Hunt-, Ko-fi- és itch.io-lap mind a BEATIUS-é, nem a Creafté.
 * A szövegeknek ezt kell tükrözniük — a Creaftnak még nincs saját launchja.
 */
export const BEATIUS = {
  name: 'BEATIUS Maximized',
  tagline: 'YouTube-zene, valódi FFT-vel.',
  description:
    'Asztali zenelejátszó, ami a YouTube hangját játssza, és közben valós idejű FFT-vel mutatja a zenét. ' +
    'Keresel, indítod, és a vizualizáció a tényleges hangra reagál — nem egy előre gyártott animáció.',
  platform: 'Windows 10/11 · telepítés nélkül · 29 MB',
  features: [
    'Valós idejű FFT-vizualizáció',
    '31 sávos EQ',
    'YouTube-keresés és lejátszás',
    'Kedvencek',
    'Offline lejátszás',
    'Billentyűparancsok',
  ],
  note: 'Az appban nincs előfizetés, nincs reklám és nincs követés — ugyanaz az elv, mint a Creaftnál.',
  links: {
    /** A készítő saját termékoldala (Webnode). */
    website: 'https://beatius-offline-music-player-8b2b31.webnode.page/',
    /** Közvetlen letöltés: „name your own price”, vagyis 0 Ft is lehet. */
    download: 'https://xd-stoodios.itch.io/beatius-maximized',
    producthunt: 'https://www.producthunt.com/products/beatius',
    /** Konkrét shop-termék: a BEATIUS Maximized lapja. */
    kofi: 'https://ko-fi.com/s/5599552726',
    /** Általános támogatás és a többi BEATIUS-változat (PC, Android, iOS). */
    kofiProfile: 'https://ko-fi.com/rust_surfer',
    source: 'https://github.com/tothdani182-lgtm/BEATIUS-mobile',
  },
  accent: '#a78bfa',
} as const;

/** Profilok és felületek. Amit üresen hagysz, az „Hamarosan” kártya — nincs halott link. */
export type ProfileKey = 'beatiusweb' | 'beatius' | 'producthunt' | 'kofi' | 'itchio' | 'github';

export interface Profile {
  key: ProfileKey;
  name: string;
  label: string;
  description: string;
  url: string;
  cta: string;
  accent: string;
  /** Opcionális figyelmeztetés, amit a kártyán is kiírunk. */
  note?: string;
}

export const PROFILES: Profile[] = [
  {
    key: 'beatiusweb',
    name: 'BEATIUS',
    label: 'Hivatalos termékoldal',
    description:
      'A BEATIUS saját bemutatkozó oldala: képernyőképek, a Maximized újdonságai és a letöltéshez vezető linkek.',
    url: BEATIUS.links.website,
    cta: 'Weboldal',
    accent: BEATIUS.accent,
  },
  {
    key: 'beatius',
    name: 'BEATIUS Maximized',
    label: 'Zenelejátszó · Windows',
    description:
      'YouTube-zene valós idejű FFT-vizualizációval, 31 sávos EQ-val, kedvencekkel és offline lejátszással. ' +
      'Telepítés nélkül indul. Az itch.io-n „name your own price”, vagyis ingyen is letölthető.',
    url: BEATIUS.links.download,
    cta: 'Letöltés',
    accent: BEATIUS.accent,
  },
  {
    key: 'producthunt',
    name: 'Product Hunt',
    label: 'BEATIUS launch',
    description:
      'A BEATIUS Product Hunt-oldala két launchhal. Itt tudod követni és felfelé szavazni a zenelejátszót.',
    url: BEATIUS.links.producthunt,
    cta: 'Megnézem',
    accent: '#fb923c',
  },
  {
    key: 'kofi',
    name: 'Ko-fi',
    label: 'BEATIUS Maximized',
    description:
      'A BEATIUS Maximized a Ko-fi shopban. A profilomon a többi változat is ott van: PC, Android és iOS.',
    url: BEATIUS.links.kofi,
    cta: 'Megnézem',
    accent: '#f472b6',
  },
  {
    key: 'itchio',
    name: 'itch.io',
    label: 'Xd_Stoodios',
    description: 'Az itch.io-profilom: a BEATIUS mellett játékok és kisebb kísérletek is.',
    url: 'https://xd-stoodios.itch.io/',
    cta: 'Profil',
    accent: '#f87171',
    note: 'A profil 18+-os korkaput kér a játékok miatt. A BEATIUS fenti linkje közvetlen.',
  },
  {
    key: 'github',
    name: 'GitHub',
    label: 'Creaft forráskód',
    description: 'A Creaft teljes forrása, hibajegyek és a kiadások. Nyíltan, letölthetően.',
    url: 'https://github.com/tothd4512-art',
    cta: 'Forráskód',
    accent: '#38bdf8',
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
