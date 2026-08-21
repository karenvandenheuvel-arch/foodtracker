# Voedingstracker

Next.js (App Router, TypeScript) versie van de Voedingslabel-prototype. Maaltijdfoto's worden
geanalyseerd door een echte Gemini-call (met gestructureerde JSON-output), en alle data
(profiel, maaltijden, sportsessies, stappen) wordt opgeslagen in een lokale SQLite-database.

## Functionaliteit

- **Loggen** — foto + optionele notitie uploaden, laten analyseren door Gemini (multimodaal:
  afbeelding + tekst), portie bijstellen en loggen.
- **Dashboard** — energiebalans van vandaag (inname vs. rustverbruik + sport + stappen),
  macroverdeling en kcal per voedingsgroep.
- **Profiel** — gewicht/lengte/leeftijd/geslacht (Mifflin-St Jeor rustverbruik), stappen van
  vandaag en sportsessies (MET-tabel).

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [`@google/generative-ai`](https://www.npmjs.com/package/@google/generative-ai) voor de Gemini-call
  in `app/api/analyze/route.ts` / `lib/gemini.ts` — met een JSON-schema zodat Gemini altijd
  gestructureerde voedingsdata teruggeeft (items, groepen, kcal/macro's, betrouwbaarheid).
- [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) voor persistente opslag
  (`lib/db.ts`), API-routes onder `app/api/*` voor profiel, maaltijden, sportsessies en stappen.

## Aan de slag

```bash
npm install
cp .env.example .env.local
# vul GEMINI_API_KEY in .env.local in — haal een key op via https://aistudio.google.com/apikey
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

De SQLite-database wordt automatisch aangemaakt op `./data/foodtracker.sqlite` (pad instelbaar
via `DATABASE_PATH`). Zonder `GEMINI_API_KEY` blijft de rest van de app werken, maar geeft
"Maaltijd analyseren" een duidelijke foutmelding.

## Omgevingsvariabelen

| Variabele        | Verplicht | Omschrijving                                             |
| ----------------- | --------- | --------------------------------------------------------- |
| `GEMINI_API_KEY`  | ja        | API-key voor Google Gemini (aistudio.google.com/apikey)   |
| `GEMINI_MODEL`    | nee       | Model-ID, standaard `gemini-2.0-flash`                    |
| `DATABASE_PATH`   | nee       | Pad naar het SQLite-bestand, standaard `./data/foodtracker.sqlite` |

## Structuur

```
app/
  page.tsx              # hoofdcomponent (tabs, state, data-orchestratie)
  api/
    analyze/route.ts    # POST foto+notitie -> Gemini-analyse
    meals/route.ts      # GET/POST maaltijden van vandaag
    meals/[id]/route.ts # DELETE maaltijd
    exercises/...        # zelfde patroon voor sportsessies
    profile/route.ts    # GET/PUT profiel
    steps/route.ts      # GET/PUT stappen van vandaag
components/
  LogView.tsx, DashboardView.tsx, ProfileView.tsx, styles.ts
lib/
  db.ts        # SQLite-verbinding + schema
  gemini.ts    # Gemini-call + JSON-schema + normalisatie
  nutrition.ts # BMR/MET-berekeningen, voedingsgroepen, kleuren
  types.ts     # gedeelde types
```

## Build

```bash
npm run build
npm run start
```
