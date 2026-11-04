# Creaft web

A Creaft nyilvános webes verziója: bemutató oldal, böngészős demó, letöltés és alkotások/profilok.

**Fontos:** a valódi APK/EXE fordítás az asztali appban fut. A webes demó szimulált naplót mutat,
nem tölt fel fájlt és nem futtat fordítót.

## Fejlesztés

```bash
cd web
npm install
npm run dev      # http://localhost:5174
npm run build    # web/dist
npm run preview  # http://localhost:4173
```

## Hirdetés

Kétféle hirdetés van, és csak a weboldalon:

1. **Saját (house) hirdetés** — alapértelmezés. A saját projekteket hirdeti (pl. BEATIUS),
   külső hirdetőhálózat, cookie és tracker nélkül.
2. **AdSense** — csak ha beállítod a környezeti változókat ÉS a látogató hozzájárult.

Bekapcsolás:

```bash
cp .env.example .env
# töltsd ki a VITE_ADSENSE_CLIENT és a VITE_ADSENSE_SLOT_* értékeket
```

Vercelben ugyanezek a változók a Project → Settings → Environment Variables alatt adhatók meg.
Új deploy kell utánuk, mert a Vite build időben fordítja be őket.

Az asztali Creaft app **nem tartalmazza** ezt a csomagot, ott nincs és nem is lesz hirdetés.

## Profilok szerkesztése

Minden link a `web/src/config.ts` fájlban van (`PROFILES`). Amelyiknek üres az `url` mezője,
az „Hamarosan” kártyaként jelenik meg, nem halott linkként.

## Deploy

Vercelre statikus fájlként megy: a `web/vercel.json` tartalmazza a build parancsot,
a kimeneti könyvtárat és a SPA rewrite-ot.
