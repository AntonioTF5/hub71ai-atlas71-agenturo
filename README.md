# Hub71 Hackathon

Next.js 16 + Tailwind + OpenRouter, deployed on Vercel.

```bash
cp .env.example .env.local   # add OPENROUTER_API_KEY
npm run dev
```

- LLM client: `src/lib/llm.ts` (OpenAI SDK pointed at OpenRouter)
- Streaming chat endpoint: `POST /api/chat` `{ messages, model?, system? }`
- Deploy: `vercel --prod` (or push to `main` once the Vercel project is Git-connected)
- Typed judgments: `src/lib/typesafe.ts` (TypeSafe System One: choice / noul / score). Use for routing, scoring, verification; OpenRouter for generation.
- Key check: `GET /api/health` verifies both keys live (never prints them).
