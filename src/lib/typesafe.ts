import { TypeSafeClient } from "@typesafe-ai/sdk";

// TypeSafe System One (Jev): fast typed judgments (choice / noul / score) instead of generated text.
// Use it for routing, classification, scoring, and verification; use OpenRouter (llm.ts) for generation.
// Docs: https://docs.typesafe.ai/llms.txt. Server-side only; reads TYPESAFE_API_KEY.
let client: TypeSafeClient | undefined;
export function typesafe() {
  client ??= new TypeSafeClient();
  return client;
}
