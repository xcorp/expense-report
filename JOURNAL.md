# Development Journal - Expense Report PDF Generation

## Problem 1: Bilder för stora för A4-sidor

### Utmaning
Bilder (särskilt långa kvitton) kan vara för höga för att få plats på en A4-sida (297mm höjd). Tidigare klipptes bilden bara av.

### Lösning: Intelligent bildsplitting
**Implementerad i:** [pdfGenerator.ts](src/pdfGenerator.ts), [config.ts](src/config.ts)

#### Designbeslut:
1. **DPI-baserad logik** 
   - `PDF_IMAGE_DPI_THRESHOLD = 300 DPI` 
   - Bilder med >300 DPI har råd att skalas ner utan kvalitetsförlust
   - Bilder med ≤300 DPI splittas för att bevara kvalitet

2. **20%-regeln**
   - `PDF_IMAGE_MIN_SPLIT_PERCENTAGE = 20%`
   - Om <20% av bilden skulle hamna på nästa sida → skala ner istället
   - Undviker onödiga splits där bara en liten del är kvar

3. **Överlapp mellan sidor**
   - `PDF_IMAGE_OVERLAP_MM = 25mm`
   - Ger kontinuitet och gör det lättare att följa bilden över sidgränser

4. **Visuella indikatorer**
   - "↑ Forts. från föregående sida: #X beskrivning"
   - "↓ Forts. på nästa sida"
   - Grå text för att inte störa huvudinnehållet

#### Resultat:
Långa kvitton (t.ex. 1080×4031px) kan nu delas upp på flera sidor med bibehållen läsbarhet.

---

## Problem 2: PDF-filstorlek för stor

### Utmaning
En PDF med en 700KB bild och en 30KB PDF-kvitto blev 6MB - orimligt stor!

### Orsaker:
- Bilder lades till i full upplösning utan komprimering
- PDF-kvitton renderades som PNG vid hög scale (1.5)
- Ingen storleksbegränsning på bilder

### Lösning: Multisteg komprimeringsstrategi
**Implementerad i:** [pdfGenerator.ts](src/pdfGenerator.ts), [config.ts](src/config.ts)

#### Steg 1: Storleksbegränsningar
```javascript
PDF_IMAGE_MAX_WIDTH_PX = 2400  // Max bredd för att begränsa filstorlek
PDF_IMAGE_OPTIMAL_WIDTH_PX = 2126  // Optimal bredd för 300 DPI vid 180mm
```

**Motivering:** 
- 2400px ger ~340 DPI vid 180mm visningsbredd
- Tillräckligt för skarp text och detaljer
- Mycket mindre än moderna mobilkameror (4000×3000px)

#### Steg 2: JPEG-komprimering
```javascript
PDF_IMAGE_JPEG_QUALITY = 0.75  // Normal kvalitet
PDF_IMAGE_JPEG_QUALITY_SPLIT = 0.85  // Chunks, högre för att undvika dubbel-komprimering
PDF_IMAGE_JPEG_QUALITY_HIGH_CONTRAST = 0.95  // Text/dokument, mycket hög kvalitet
```

#### Steg 3: PDF-kvitton optimering
- Scale sänkt från 1.5 till 1.2
- Renderas som JPEG istället för PNG
- Använder `PDF_IMAGE_JPEG_QUALITY` (75%)

#### Resultat:
**6MB → 700KB** (~89% reduktion) med bibehållen visuell kvalitet!

---

## Problem 3: Text blev suddig på kvitton

### Utmaning
JPEG-komprimering introducerar artefakter på högt kontrast-innehåll (svart text på vit bakgrund).

### Lösning: Smart format-val baserat på kontrast-detektion
**Implementerad i:** [pdfGenerator.ts](src/pdfGenerator.ts) - `detectHighContrast()`, `detectHighContrastFromImage()`

#### Kontrast-detektions-algoritm:

1. **Sampling-strategi:**
   - Ta 600×600px sample från bilden
   - Startposition: 10% från vänster kant, vertikalt centrerad
   - Undviker logotyper/headers som ofta är överst

2. **Analys:**
   - Konvertera pixlar till gråskala: `0.299*R + 0.587*G + 0.114*B`
   - Sample varje 10:e pixel för prestanda
   - Beräkna standardavvikelse av gråskalevärden

3. **Beslut:**
   ```javascript
   if (stdDev > PDF_IMAGE_CONTRAST_THRESHOLD) {
     // Högt kontrast → text/dokument
     format = 'PNG' eller JPEG 95%
   } else {
     // Lågt kontrast → foto
     format = JPEG 75-85%
   }
   ```

**Tröskelvärde:** `PDF_IMAGE_CONTRAST_THRESHOLD = 85`

#### Format-val per scenario:

| Scenario | Kontrast | Format | Motivering |
|----------|----------|--------|------------|
| Single-page bild | Hög | Original PNG direkt | Maximal skärpa, ingen canvas |
| Single-page bild | Låg | JPEG 75% | Liten filstorlek |
| Split chunks | Hög | JPEG 95% | Skarp text, rimlig filstorlek |
| Split chunks | Låg | JPEG 85% | God kvalitet för foton |

---

## Problem 4: Dubbel-komprimering gav dålig kvalitet

### Insikt
JPEG använder 8×8 blockbaserad komprimering. Att komprimera en bild, sedan splitta den, sedan komprimera chunks igen gav dubbla artefakter.

### Lösning: Olika vägar för split vs non-split

#### Bilder som INTE splittas:
```
Original → Komprimera till JPEG/PNG → Lägg till i PDF
```

#### Bilder som SPLITTAS:
```
Original (okomprimerad) → Splitta i chunks → Komprimera varje chunk
```

**Viktigt:** Varje chunk är en helt oberoende bild, så JPEG-komprimering appliceras bara en gång!

#### Resultat:
Mycket skarpare text på splitta kvitton.

---

## Problem 5: Canvas rendering introducerade suddignet

### Orsaker:
1. **Image smoothing:** Canvas har `imageSmoothingEnabled = true` som default, vilket interpolerar pixlar
2. **Fel canvas-storlek:** Att rita 1080px bild i 1080px canvas, men visa som 180mm i PDF får jsPDF att skala
3. **Onödig canvas-processning:** Varje gång bilden går genom canvas finns risk för kvalitetsförlust

### Lösning: Multi-level approach

#### Åtgärd 1: Stäng av image smoothing
```javascript
ctx.imageSmoothingEnabled = false;
```
Förhindrar att canvas blurrar vid rendering.

#### Åtgärd 2: Skippa canvas för högt kontrast när möjligt
```javascript
if (isHighContrast && !needsResize) {
  doc.addImage(imgElement, 'PNG', margin, startY, displayWidth, displayHeight);
  // Ingen canvas - använd original direkt!
}
```

#### Åtgärd 3: Optimal canvas-storlek för foton
För bilder som måste gå genom canvas (resize, split):
- **Högt kontrast:** Använd original-storlek (1080px)
- **Lågt kontrast:** Skala till optimal storlek (2126px för 300 DPI)

**Motivering:** Låt jsPDF själv hantera skalning av text-bilder (de klarar det bättre), men ge den perfekt storleksatta foton.

---

## Slutligt flöde

### För Single-Page bilder:

```
┌─────────────────┐
│  Ladda bild     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Detektera kontrast  │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐   ┌─────┐
│ Hög │   │ Låg │
└──┬──┘   └──┬──┘
   │         │
   ▼         ▼
Original  Canvas
direkt    JPEG 75%
PNG
```

### För Split bilder:

```
┌─────────────────┐
│  Ladda bild     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Detektera kontrast  │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│Hög (text)│ │Låg (foto)│
└────┬─────┘ └────┬─────┘
     │            │
     ▼            ▼
Original-     Optimal-
storlek       storlek
canvas        canvas
     │            │
     └─────┬──────┘
           ▼
     Split i chunks
           │
           ▼
    JPEG 95%/85%
```

---

## Konfiguration

Alla värden är anpassningsbara i [config.ts](src/config.ts):

```typescript
// Splitting-logik
PDF_IMAGE_DPI_THRESHOLD = 300
PDF_IMAGE_MIN_SPLIT_PERCENTAGE = 20
PDF_IMAGE_OVERLAP_MM = 25

// Storleksbegränsningar
PDF_IMAGE_MAX_WIDTH_PX = 2400
PDF_IMAGE_OPTIMAL_WIDTH_PX = 2126

// Kvalitetsinställningar
PDF_IMAGE_JPEG_QUALITY = 0.75
PDF_IMAGE_JPEG_QUALITY_SPLIT = 0.85
PDF_IMAGE_JPEG_QUALITY_HIGH_CONTRAST = 0.95

// Kontrast-detektion
PDF_IMAGE_CONTRAST_THRESHOLD = 85
```

---

## Resultat & Metrics

| Metric | Före | Efter | Förbättring |
|--------|------|-------|-------------|
| PDF-storlek (700KB bild + 30KB PDF) | 6 MB | 700 KB | **-89%** |
| Text-skärpa på kvitton | Suddig | Skarp | ✅ |
| Långa bilder | Klipps av | Splittas med överlapp | ✅ |
| Foton kvalitet | Bra | Bra | ✅ (bibehållen) |

---

## Framtida förbättringar

1. **WebP-format:** Modernare än JPEG, ~25% bättre komprimering
2. **Adaptiv sampling:** Analysera flera områden för kontrast-detektion
3. **OCR-baserad detektion:** Detektera faktisk text istället för kontrast
4. **Progressiv rendering:** Visa lågupplöst preview medan PDF genereras
5. **Worker-threads:** Flytta canvas-processning till web worker för bättre prestanda

---

## Lärdomar

1. **JPEG är inte fienden** - 95% kvalitet ger skarp text med mycket mindre filstorlek än PNG
2. **Canvas smoothing dödar skärpa** - Alltid stäng av för dokument
3. **En komprimering är bättre än två** - Undvik dubbel-komprimering i splitflöden
4. **Original är bäst när möjligt** - Skippa canvas helt för text-bilder som inte behöver resize
5. **Kontext är viktig** - Text behöver olika behandling än foton

---

# Projekthistorik från Git-commits

## 1. TIDIG UTVECKLING (commits 18bd67c - cd07a5a)

### Initial projektuppläggning (18bd67c)
**Vad:** Grundläggande React-applikation med TypeScript, Vite build-system, Tailwind CSS för styling och deployment till GitHub Pages via GitHub Actions.

**Varför:** Behövde en modern, snabb utvecklingsmiljö med automatisk deployment för enkel iteration och testning.

**Tekniska beslut:**
- Vite som build-verktyg för snabb utveckling och HMR (Hot Module Replacement)
- React 18 med TypeScript för typsäkerhet
- Tailwind CSS för snabb UI-utveckling med utility-first approach
- GitHub Actions för CI/CD med automatisk deployment till GitHub Pages
- Dexie.js för lokal IndexedDB-lagring av utgifter

### Kärnfunktioner för utgiftshantering (18bd67c)
**Vad:** Formulär för att lägga till utgifter med kvittobilder, kategorisering, kostnad och datumstämpel. Lista över alla utgifter med raderingsmöjlighet. Bankuppgifter för utbetalning.

**Varför:** Användare måste kunna registrera utgifter med kvittobevis och se en översikt före rapportgenerering.

**Tekniska beslut:**
- IndexedDB via Dexie för offline-first lagring (data finns kvar även vid reload)
- ArrayBuffer för bildlagring (kompakt binär representation)
- `browser-image-compression` för att komprimera bilder till max 1MB och 1200px
- Separata komponenter för form, lista och items (modulär kod)

### PDF-generering och delning (18bd67c)
**Vad:** Automatisk PDF-rapport med sammanfattande tabell och kvittobilder. Stöd för Web Share API (mobil) och nedladdning (desktop).

**Varför:** Användare behöver en professionell rapport för ekonomisk redovisning med båda delningsmetoder beroende på enhet.

**Tekniska beslut:**
- jsPDF för PDF-skapande
- jspdf-autotable för tabellgenerering
- Web Share API med fallback till nedladdning
- Svensk lokalisering (SEK, svenskt datumformat)
- Kvittobilder renderas som JPEG med automatisk sidbrytning

---

## 2. FUNKTIONER TILLAGDA (commits 698d008 - dc8dae6)

### Körningsutgifter med avståndskalkylering (7ba45da)
**Vad:** Specialfunktion för bilkörning med start/stopp-adresser, mellanliggande stopp, distansberäkning via Google Maps API och automatisk kostnadsberäkning.

**Varför:** Körningsersättning är en vanlig utgift som kräver distansbevis och beräknas per kilometer.

**Tekniska beslut:**
- Google Maps Directions API för distansberäkning
- Google Maps Autocomplete för adresssökning med svenska förslag
- Statisk karta med färgkodade markörer (start=grön, stopp=röd, mellanliggande=blå)
- Konfigurerbar kr/km-sats: `DRIVING_COST_MULTIPLIER = 2.5`
- Separata fält för ändamål och passagerare

### PDF-kvittohantering och pdf-in-pdf rendering (644f045 - 4548bb0)
**Vad:** Möjlighet att ladda upp PDF-kvitton istället för bilder. PDF-filer renderas till bilder via canvas och läggs in i rapporten.

**Varför:** Många kvitton kommer som digitala PDF-filer (e-kvitton, fakturor).

**Tekniska beslut:**
- pdfjs-dist för PDF-läsning och canvas-rendering
- Lokal kopia av pdf.worker.min.js för att undvika CORS-problem
- Varje PDF-sida renderas till en bild och läggs in i rapporten
- Scale 1.5 för högre kvalitet (senare optimerad till 1.2)

### Tesseract.js OCR för kvittoskanning (dc8dae6)
**Vad:** Automatisk OCR-skanning av kvitton för att extrahera totalbelopp med stöd för svenska mönster.

**Varför:** Manuell inmatning av belopp är tidskrävande och felbenägen. OCR automatiserar detta.

**Tekniska beslut:**
- Tesseract.js för klient-baserad OCR (inget backend-beroende)
- Svenska + engelska språkmodeller ('swe+eng')
- Flera svenska mönster: "totalt", "summa", "total", "att betala", "subtotal"
- Auto-apply vid en matchning, manuellt val vid flera matchningar
- Deferred HEIC-konvertering för att undvika crash vid filuppladdning
- Lokal worker.min.js för att undvika CDN-beroende

---

## 3. UI/UX-FÖRBÄTTRINGAR (commits 84c6fec - afac918)

### Inställningsformulär ersätter bankuppgifter (173f16d)
**Vad:** Konsoliderat formulär för bankuppgifter OCH standardkategori, ersätter BankDetailsForm med SettingsForm.

**Varför:** Bättre användarupplevelse att ha alla inställningar på ett ställe, plus möjlighet att sätta förvald kategori.

**Tekniska beslut:**
- Collapsed-by-default för mindre visuellt brus
- Auto-expand om något obligatoriskt fält saknas
- Validering av standardkategori (endast kända kategorier)
- Guidance-text för bankkontoformat (clearing och kontonummer för svenska storbanker)

### Kategorihantering (c24157f)
**Vad:** Förkonfigurerade kategorier i `config.ts`, stöd för "Övrigt" med anpassad text.

**Konfiguration:**
```typescript
CATEGORIES = [
  '4010 Svamparna',
  '4020 Träden',
  '4030 Djungeldjuren',
  '4040 Vildfåglarna',
  '4050 Skogslöparna',
  '4060 Utmanarna',
  '4070 Ledare',
  '4080 Styrelse och Kårstämmor',
  '4090 Kårgemensamma aktiviteter',
  '6990 Övriga Kostnader',
  // ... med flera
]
```

### Hjälpguider och användarstöd (9534328, afac918)
**Vad:** Instruktioner för körningsutlägg och rapportdelning.

**Varför:** Användare behöver vägledning för korrekta inmatningar och hur man delar rapporten.

### Filnamnsanitisering och dynamiska filnamn (70cdac0)
**Vad:** Generera filnamn baserat på rapportörens namn och datum (`Utlägg-[NAMN]-[DATUM].pdf`).

**Tekniska beslut:**
- Unicode normalisering (NFKD) för att ta bort accenter
- Regex för att ta bort osäkra tecken
- Mellanslag ersätts med bindestreck
- Fallback till "Unknown" vid tomt namn

### Build-time commit info-generering (7d396bf)
**Vad:** Automatisk generering av commit hash och git tag vid build, visning i info-modal.

**Varför:** Underlättar felsökning och versionshantering i produktion.

**Tekniska beslut:**
- Node-script körs före build
- `git rev-parse --short HEAD` för commit hash
- Info-knapp (fixed bottom-right) visar version och copyright

---

## 4. PDF-OPTIMERING (commits 477d644 - aca3824)

_Se detaljerad beskrivning i Problem 1-5 ovan - detta är där dagens intensiva arbete skedde._

### Sammanfattning av PDF-optimeringar:
1. **Bildkomprimering** - Max 2400px bredd, JPEG kvalitet 75-95%
2. **Kontrast-detektion** - Automatisk val mellan PNG och JPEG
3. **Bildsplitting** - Intelligens split av långa bilder över flera sidor
4. **Canvas-optimering** - Disabled smoothing, optimal storlek
5. **PDF-kvitto rendering** - Scale 1.2, JPEG 75%

**Resultat:** 6MB → 700KB med bibehållen kvalitet

---

## 5. FIX: UPPLADDNINGSKOMPRIMERING FLASKHALS (2026-02-03)

### Problem upptäckt
Efter PDF-optimering upptäcktes att bilder fortfarande var suddiga. Orsak: `browser-image-compression` komprimerade bilder till max 1200px vid uppladdning, långt innan PDF-generatorn fick tillgång till bilden.

**Konsekvens:**
- Original 4000×3000px bild → nedskalad till 1200×900px vid uppladdning
- PDF-generator arbetar med denna 1200px bild
- Vid rendering på A4 (180mm bredd) → endast ~230 DPI
- Under `PDF_IMAGE_DPI_THRESHOLD = 300` → bilden splittas men saknar upplösning
- Hela DPI-baserade optimeringslogiken blev meningslös

### Lösning
**Uppdaterat i:** [ExpenseForm.tsx](src/components/ExpenseForm.tsx)

Höjt uppladdningsgränser för att bevara upplösning till PDF-generering:
```javascript
// Tidigare
maxSizeMB: 1, maxWidthOrHeight: 1200

// Nu
maxSizeMB: 2, maxWidthOrHeight: 2400  // Matchar PDF_IMAGE_MAX_WIDTH_PX
```

**Motivering:**
- PDF-generatorn behöver tillgång till full upplösning (upp till 2400px) för att kunna göra smarta beslut
- Den har redan sofistikerad kontrast-baserad komprimering
- Låt uppladdningen bevara kvalitet, låt PDF-generatorn optimera

**Resultat:**
Nu når bilder 300+ DPI vid PDF-rendering → skarp text på kvitton! ✅

---

## SAMMANFATTNING AV TEKNISKA BESLUT

### Arkitektur:
- Single Page Application (SPA) med React och TypeScript
- Offline-first design med IndexedDB (Dexie)
- No backend - allt körs i webbläsaren
- Progressive Web App-principer

### Datalagring:
- Utgifter: IndexedDB via Dexie (persistent)
- Inställningar: localStorage (bankuppgifter, standardkategori)
- Bilder: ArrayBuffer i IndexedDB (komprimerade JPEG)

### Externa API:er:
- Google Maps Directions API (distansberäkning)
- Google Maps Autocomplete Service (adresssökning)
- Google Maps Static Maps API (kartbilder)

### Klient-baserade bibliotek:
- jsPDF + jspdf-autotable (PDF-generering)
- browser-image-compression (bildkomprimering)
- heic2any (HEIC→JPEG konvertering)
- pdfjs-dist (PDF-läsning)
- Tesseract.js (OCR)

### Deployment:
- GitHub Actions CI/CD
- GitHub Pages hosting
- Automatisk build vid push till master
- Konfigurerbar basepath via environment variables

---

*Dokumentet uppdaterat: 2026-02-03*
