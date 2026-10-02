# Atlas71

Atlas71 is a chat-first AI agent that lands founders in Abu Dhabi. First it helps them decide whether Abu Dhabi fits their business and life (taxes, opportunities, residency, working conditions, first-year costs against their home base). Then it picks the licence route, shows every step with dates, quotes one all-in price, and files everything, on through visas, the bank and payments.

Live: **https://hub71-hackathon.vercel.app** (a public sandbox: integrations, filings and payments are simulated, the founders are fictional, and the AI is live).

## Demo script (5–10 minutes)

1. **Routely** (B2B SaaS, Bangalore, moving with family). Click the persona card. Atlas71 checks the facts against Meera's words with TypeSafe and asks whether Arjun is moving: **Just me for now**.
2. **Decide.** The *Abu Dhabi vs Bangalore* card compares taxes, opportunities, residency, work and first-year costs, with live TypeSafe judgments on what matters. Then comes the Hub71 letter question: **No**.
3. **Route.** A live TypeSafe batch (about 150 ms) recommends the ADGM Tech Startup Licence. Prerequisites: the Hub71 letter (Atlas71 files it), and a dedicated desk.
4. **Show my plan**, then **What will it cost?**: one total, **AED 40,075**, itemised. Press **Confirm & pay** (simulated).
5. **+2 weeks** in the tracker: desk signed, Hub71 letter issued, ADGM incorporation filed automatically.
6. **+2 weeks** again: licence issued, establishment card, tax registration with its deadline, and the entry permit. Atlas71 asks for a medical slot (tap one) and drafts the bank file. TypeSafe flags *source of funds* and *ownership*. Reply:
   > $600k from 8 angel investors through convertible notes in Routely, our DPIIT-recognised Bangalore company. Routely will own 100% of the ADGM company; Arjun and I own Routely 55% and 45%.

   The re-check passes: "Prepared for bank review".
7. **+2 weeks**: resident, banked, payments live. **Export pack** downloads the Markdown pack and the JSON case.
8. **Reset demo**, then **Byteforge** (dev agency, Cairo, 4 people moving). TypeSafe flags a technology service provider. The startup licence doesn't fit, so Atlas71 recommends the ADGM standard licence and shows Masdar City as the cheaper alternative, with the price difference.

The composer also takes **voice** (mic button, transcribed by Gemini through OpenRouter) and **files** (images and PDFs, e.g. a marriage certificate for a dependant visa). The app installs as a **PWA**.

## How it works

- `src/lib/atlas/engine.ts`: the deterministic engine (route rules, dated plan, one price, filing simulator). Pure, so the tracker reuses it in the browser.
- `src/lib/atlas/compare.ts` + `places.ts`: the Abu Dhabi vs home-base comparison, with sources in `kb.ts`.
- `src/lib/atlas/checks.ts`: TypeSafe batches for the route fit, the bank file, what matters to the founder, and checking each saved fact against the founder's words.
- `src/lib/atlas/tools.ts` + `src/app/api/agent/route.ts`: the agent loop on OpenRouter (default `openai/gpt-6.1-sol`), streaming NDJSON events to the client.
- `src/components/atlas/*`: the chat UI, cards, tracker and composer.

## Run and test

```bash
npm install
npm test
npm run dev
```

Keys live on Vercel (`OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`). Without them, local dev shows the "AI setup required" state. Optional: `ATLAS_AGENT_MODEL` (default `openai/gpt-6.1-sol`) and `OPENROUTER_TRANSCRIBE_MODEL` (default `google/gemini-2.5-flash`). `GET /api/health` verifies both keys without exposing them, and `GET /api/version` shows the deployed commit and model. Every push to `main` deploys production.
