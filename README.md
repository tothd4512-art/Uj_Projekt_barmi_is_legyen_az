# BuildMűhely

Grafikus, helyi alkalmazás webes projektek **Android APK** és **Windows EXE** csomagolására.

Nem parancssoros építőeszköz: a felületen importálod a projektedet, beállítod a nevét/azonosítóját/verzióját, kiválasztod a célt, és követed a valódi fordítási naplót. A kész fájl közvetlenül letölthető.

- Nincs fiók.
- Nincs e-mailes várólista.
- Nincs előfizetés a letöltéshez.
- A fordítás a te gépeden fut, nem színlelt siker.

## Mit épít?

| Bemenet | Kimenet | Motor |
|---|---|---|
| Webes projekt `index.html`-lel | Android APK | Capacitor + Gradle |
| Webes projekt `index.html`-lel | Windows EXE | Electron + electron-builder |

Ez az első változat webes forrásból dolgozik. Nem fordít tetszőleges Python, Flutter vagy natív projektet.

## Indítás fejlesztőként

```bash
npm install
npm run electron:dev
```

Csak böngészős felület:

```bash
npm run dev
```

Asztali csomag készítése:

```bash
npm run electron:build
```

## Használat

1. Kattints a **ZIP importálása** gombra, vagy hozz létre egy **Mintaprojektet**.
2. A ZIP-ben legyen `index.html` (gyökérben vagy egy almappában).
3. A **Fordítás** oldalon állítsd be a nevet, csomagazonosítót, verziót.
4. Válaszd ki: **Windows EXE** vagy **Android APK**.
5. Indítsd a fordítást, és kövesd a naplót.
6. Elkészült fájlok: **Elkészült fájlok** → **Letöltés**.

## Követelmények

### Windows EXE
- Node.js + npm
- Windows ajánlott. Linux/macOS keresztfordításhoz Wine vagy CI szükséges lehet.

### Android APK
- Node.js + npm
- Java 17+
- Android SDK (`ANDROID_HOME` vagy `ANDROID_SDK_ROOT`)
- Első fordításkor a Gradle letöltheti a függőségeket.

A **Környezet** oldal megmutatja, mi elérhető és mi hiányzik.

## Előnézeti mód

Ha a szerver nyilvános címre kötve fut (`HOST=0.0.0.0`), alapból előnézeti módban indul: a projektimport, mentés és fordítás le van tiltva. Ez biztonsági okokból van így, mert a fordítás helyi eszközöket futtat.

Az asztali Electron app nem előnézeti módban fut.

## Biztonság

Csak olyan projektet fordíts, amelyben megbízol. A build folyamat helyi fordítóeszközöket futtat. A ZIP-importálás ellenőrzi az útvonalakat és a méretkorlátokat.

## Aláírás

Az első változat debug APK-t és hordozható EXE-t készít. Play Store feltöltéshez release aláírás, Windows SmartScreen elkerüléséhez pedig kódaláíró tanúsítvány kellhet. Ezeket nem kerüljük meg és nem ígérjük ingyen.
