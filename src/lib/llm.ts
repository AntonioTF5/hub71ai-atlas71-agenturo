import OpenAI from "openai";

// OpenRouter speaks the OpenAI API, so the official SDK works with a different baseURL.
// Created lazily so `next build` doesn't need the key.
let client: OpenAI | undefined;
export function llm() {
  client ??= new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "hub71-hackathon",
    },
  });
  return client;
}

// Swap per call or via env. Browse ids at https://openrouter.ai/models
export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-5.5";

// The Atlas71 agent and its drafting run on an OpenAI mid-tier model (GPT-6.1 Sol) through OpenRouter.
// Override with ATLAS_AGENT_MODEL. TypeSafe (typesafe.ts) still answers the eligibility and bank checks.
export const AGENT_MODEL = process.env.ATLAS_AGENT_MODEL ?? "openai/gpt-6.1-sol";

/**
 * Per-family request extras for chat.completions.create(). OpenAI reasoning models take a reasoning
 * effort and no temperature; Claude 5.x always reasons, so keep it minimal. Reasoning tokens count
 * against max_tokens, so callers keep max_tokens generous.
 */
export function modelParams(model: string, effort: "minimal" | "low" | "medium" = "low"): Record<string, unknown> {
  if (model.startsWith("openai/")) return { reasoning: { effort } };
  if (model.startsWith("anthropic/")) return { temperature: 0.3, reasoning: { effort: "minimal" } };
  return { temperature: 0.3 };
}
