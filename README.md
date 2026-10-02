# Atlas71

Atlas71 is a chat-first AI agent that lands founders in Abu Dhabi. First it helps them decide whether Abu Dhabi fits their business and life (taxes, opportunities, residency, working conditions, first-year costs against their home base). Then it picks the licence route, shows every step with dates, quotes one all-in price, and files everything, on through visas, the bank and payments.

Live: **https://hub71-hackathon.vercel.app** (a public sandbox: integrations, filings and payments are simulated, the founders are fictional, and the AI is live).

## Demo script (5–10 minutes, desktop)

1. **Sign in** with the sandbox account chip (a clearly labelled Atlas71 sandbox sign-in; nothing is collected), then click the **Routely** persona (B2B SaaS, Bangalore-based, raised $600k, Meera moving with her family). Atlas71 checks each fact against Meera's words with TypeSafe and asks whether Arjun is moving: **Just me for now**.
2. **Decide.** The *Abu Dhabi vs Bangalore* card compares taxes, opportunities, residency, work and first-year costs, with live TypeSafe judgments on what matters. Every row cites its source.
3. **Route.** A live TypeSafe batch recommends the ADGM Tech Startup Licence. Prerequisites: the Hub71 letter, a dedicated desk, and one trip to the UAE by the signatory. Atlas71 **asks before applying** to Hub71: **Yes, apply for me**.
4. **Passports.** **Use my saved passports** (fictional sandbox passports; only the last 4 characters are kept) or upload photos or PDFs (up to 20 MB each). The details card shows validity (6+ months needed) and what the details pre-fill.
5. **Show my plan**, then **What will it cost?**: one total, **AED 40,575**, itemised with sources. **Confirm & pay** opens an express-checkout bubble (sandbox, test card, no brand marks) listing exactly what paying authorises, then returns the receipt.
6. Atlas71 asks when the signatory first lands in the UAE (pick one). Then **+2 weeks** in the tracker: desk signed, Hub71 letter issued, ADGM incorporation filed. **+2 weeks** again, then **Next event**: licence issued, establishment card, tax registration with its deadline, entry permit. Atlas71 asks for a medical slot and drafts the bank file. TypeSafe flags *source of funds* and *ownership*. Reply:
   > $600k from 8 angel investors through convertible notes in Routely, our DPIIT-recognised Bangalore company. Routely will own 100% of the ADGM company; Arjun and I own Routely 55% and 45%.

   The re-check passes: "Prepared for bank review".
7. **+2 weeks**: resident, banked, payments live. **Export pack** downloads the Markdown pack and the JSON case.
8. **Reset demo**, then **Byteforge** (dev agency, Cairo, 4 people moving). TypeSafe flags a technology service provider, so Atlas71 recommends the ADGM standard licence (2 visas per desk, so two desks) and shows Masdar City as the alternative.

Also in the composer: **voice** (transcribed by Gemini through OpenRouter), **files** (images and PDFs), and the agent can **search and read the web** (Tavily) when a fact needs checking. The app installs as a **PWA**.

Every fee, duration and rule in the knowledge base cites a source page opened on 2 Oct 2026 (`src/lib/atlas/kb.ts`). The simulated clock compresses the Hub71 wait (the form promises 21 working days). Not yet verified officially: Masdar's visa fees (published, not yet modelled, so Masdar stays a partial quote), the Wio/Stripe timings, and whether dependants count toward ADGM's desk visa quota.

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

Keys live on Vercel (`OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, `TAVILY_API_KEY` for web search; `BLOB_READ_WRITE_TOKEN` for 20 MB uploads: create a Blob store in the Vercel dashboard and connect it to the project; without it, attachments fall back to small inline files). Without them, local dev shows the "AI setup required" state. Optional: `ATLAS_AGENT_MODEL` (default `openai/gpt-6.1-sol`) and `OPENROUTER_TRANSCRIBE_MODEL` (default `google/gemini-2.5-flash`). `GET /api/health` verifies both keys without exposing them, and `GET /api/version` shows the deployed commit and model. Every push to `main` deploys production.
