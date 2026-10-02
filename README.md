# Atlas71: the AI agent that decides, then lands your startup in Abu Dhabi

**Live demo: https://hub71-hackathon.vercel.app** (no login needed; public sandbox) · Repo: `hub71ai-atlas71-agenturo`

Atlas71 is a chat-first agent for founders who are thinking about moving their company and family to Abu Dhabi. It starts with the question every founder actually has ("does Abu Dhabi fit us?"), answers it with sourced numbers, and then does the paperwork: licence route, dated plan, one all-in price, consent-gated filings, passports, bank file, visas.

Built for the Hub71+ AI Hackathon on a modern AI stack:

| Layer | What we use |
| --- | --- |
| Agent brain | **OpenAI GPT-6.1 Sol** (OpenAI SDK, streaming tool-calling loop we wrote ourselves) |
| Typed judgments | **TypeSafe** System One models (`jev`): route fit, bank-file review, what matters to the founder, and a claim check on every fact the agent saves |
| Live web | **Tavily** search and page extraction, so the agent can check a fee or read an official page mid-conversation |
| Voice | Voice dictation in the composer, transcribed server-side |
| Files | PDFs and photos up to 20 MB (passports, certificates), read by the model |
| App | Next.js 16, React 19, Tailwind 4, installable PWA, deployed on Vercel |

## The problem

Moving a company to Abu Dhabi is a maze that nobody explains in order. The information is spread over ADGM, Hub71, ICP, SEHA, the FTA, the bank and the free zones, each with its own fees, timelines and prerequisites. Founders discover the traps late: the Hub71 eligibility letter you need *before* the startup licence, the signatory who must physically enter the UAE *before* incorporation, the dedicated-desk visa quota, the family documents that need legalising because the UAE isn't in the Apostille Convention, the passport that must be valid for six more months.

And before any of that, they haven't even decided. A founder in Bangalore or Cairo is weighing taxes, opportunities, residency, working conditions and what a family home and school cost, with half-remembered blog posts.

**Who it's for:** founders and early teams relocating to Abu Dhabi, with or without family. **Why now:** Abu Dhabi is courting them (Hub71, ADGM's startup licence, golden visas), and the friction is the bottleneck.

## What Atlas71 does

1. **Decide.** A side-by-side card, *Abu Dhabi vs your home base* (Bangalore and Cairo ship today), compares taxes, opportunities, residency, working conditions and first-year costs. Every cell links to the official page it came from, and TypeSafe flags which rows matter for *this* founder.
2. **Route.** TypeSafe judges the business (own product vs service provider vs regulated) and the engine picks ADGM Tech Startup Licence, ADGM standard licence or Masdar City, with the reasons and the prerequisites.
3. **Plan and price.** A dated plan (best and typical windows, chained by dependency) and **one all-in price**, itemised in AED with a source per line.
4. **Ask before acting.** Nothing is done on the founder's behalf without their say-so. The Hub71 application needs an explicit yes, passports are read once and reused, and the checkout lists exactly what paying authorises.
5. **Pay and land.** An express-checkout bubble in the chat (sandbox, test card) returns a receipt, then Atlas71 files in order, asks for the founder's first UAE entry date, books the medical, builds the bank file and tracks every deadline on a simulated clock.
6. **Bank file with a safety net.** TypeSafe reviews the file for source of funds, ownership traced to people, and expected activity before it goes anywhere.

## Agent capabilities

The agent (`src/lib/atlas/tools.ts`) is a bounded tool-calling loop: 8 turns, a soft deadline, an NDJSON stream to the UI, and a forced fallback so a turn never ends silently.

- `save_profile`: stores facts the founder stated. Each sensitive fact is **verified against the founder's own words with TypeSafe**; anything they didn't say is dropped and asked about again.
- `compare_abu_dhabi`, `check_route`, `show_plan`, `show_price`, `choose_route`: the decision and planning cards.
- `start_landing`, `advance_time`, `provide_input`: payment, the filing simulator, and the founder's answers (consent, entry date, medical slot, documents).
- `save_identity`: passport details from photos or the saved sandbox passports; only the last 4 characters are kept.
- `prepare_bank_file`: drafts from confirmed facts only, then runs the TypeSafe bank checks.
- `web_search`, `fetch_url`: live web through Tavily, with official-source preference and untrusted-content handling.
- `offer_choices`: tappable answers, so the conversation is mostly taps on mobile.
- `export_pack`: downloads the landing pack (Markdown) and the case file (JSON).

## Why it's different

- **A real decision tool, not a form.** It compares against the founder's actual home base, with row-level sources, and says honestly where Abu Dhabi loses (cost of living).
- **Deterministic where it must be, AI where it helps.** Prices, dates, quotas and filing order come from a pure engine with unit tests; the LLM talks, reasons and calls tools; TypeSafe supplies calibrated yes/no judgments in around 150 ms.
- **Consent-first.** The agent can't file, apply or book anything the founder hasn't agreed to, and the checkout card spells out what is authorised.
- **A UI built around the case**, not a text box: comparison, route, plan, price, passport, checkout, filings and bank-file cards, plus a live tracker with a simulated clock.

## Unique data

Atlas71 ships a curated knowledge base of **67 sources** (`src/lib/atlas/kb.ts`), each labelled official or secondary and opened on 2 Oct 2026; Atlas71's own fee is marked as a hypothesis. It covers ADGM fee schedules (GS schedule dated 26 Jun 2026), ADGM corporate-affairs quotas and timelines, ICP, SEHA, the FTA, MoF, Hub71, and the home-base cost and tax data for India and Egypt. Fees are AED at cost; each price line cites its source and the comparison table cites a source per cell. The knowledge base also encodes the **sequencing traps** that founders hit late:

- ADGM only appoints an authorised signatory who has entered the UAE, so incorporation waits for a first-entry date.
- The standard licence carries 2 visas per desk; the startup licence 3.
- The Hub71 eligibility letter is separate from the selective Access programme.
- The UAE isn't in the Apostille Convention, so family documents need legalisation.
- Residence visas need a passport valid for 6+ months.

## Privacy and speed

- **Privacy:** the case lives in the browser and is sent per turn; there is no server-side database. Passport numbers are stored as the last 4 characters only. Uploaded files are deleted once the turn is answered. API keys are server-only. Founders are fictional and filings are simulated.
- **Speed:** typed judgments return in roughly 120-250 ms, the LLM runs at minimal reasoning effort with streamed output, and the plan, price and filing simulator are instant pure functions that also run in the browser.

## Honest limits

This is a sandbox. Integrations, filings, payments and the bank are simulated, the AI checks are not official decisions, and the simulated clock compresses the Hub71 wait (Hub71's form promises a status update within 21 working days). Not yet verified against an official source: Wio and Stripe timings, and whether dependants count toward ADGM's desk visa quota. Masdar is shown as a partial quote because its visa fees aren't modelled.

## Roadmap

- Real integrations: Hub71's eligibility form, ADGM ACCESS, ICP/TAMM, SEHA booking and bank APIs, behind the same consent model.
- More home bases (Pakistan, Nigeria, UK, EU) and more destinations (DIFC, RAKEZ, Dubai mainland), driven by the same sourced knowledge base.
- Document intelligence: read and legalisation-check certificates, pre-fill every government form from the saved identity.
- A founder dashboard that watches regulation changes (fees, quotas, deadlines) and re-prices the plan automatically.
- Team and adviser handoff: share the case with a lawyer or PRO for review before filing.

## Demo in 3 minutes

1. Open the live URL and click **Routely** (B2B SaaS, Bangalore-based, $600k raised). Choose the sandbox account.
2. Answer **Just me for now**, watch the *Abu Dhabi vs Bangalore* card, then **No** to the Hub71 letter.
3. See the recommended route, then **Yes, apply for me** (consent), **What will it cost?** and **Use my saved passports**.
4. **Confirm & pay** and watch the checkout, then pick a landing date.
5. Press **+2 weeks** twice and **Next event**: licence, establishment card, tax registration, entry permit, and a medical slot to pick.
6. Optional: **Reset demo** and try **Byteforge** (a Cairo dev agency): the engine routes to the ADGM standard licence with two desks.

Access: no login is required. The sign-in is a labelled sandbox with demo accounts only; nothing is collected.

## Run locally

```bash
npm install
npm test
npm run dev
```

Environment (`.env.example`): `OPENROUTER_API_KEY` (OpenAI models through OpenRouter), `TYPESAFE_API_KEY`, `TAVILY_API_KEY`, optional `BLOB_READ_WRITE_TOKEN` for 20 MB uploads and `ATLAS_AGENT_MODEL` (default `openai/gpt-6.1-sol`). `GET /api/health` verifies the provider keys without exposing them, and `GET /api/version` shows the deployed commit.

## Code map

- `src/lib/atlas/engine.ts`: the deterministic engine (route rules, dated plan, one price, filing simulator, consent and identity gating).
- `src/lib/atlas/kb.ts`, `compare.ts`, `places.ts`: the sourced knowledge base and the home-base comparison.
- `src/lib/atlas/checks.ts`: the TypeSafe question batches.
- `src/lib/atlas/tools.ts`, `prompt.ts`, `src/app/api/agent/route.ts`: the agent loop, its tools and prompt.
- `src/components/atlas/*`: the chat UI, cards, tracker, composer, voice and file input.
