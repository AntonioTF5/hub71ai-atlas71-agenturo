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

// OpenRouter's unified reasoning switch. The agent needs quick tool calls, not hidden thinking, and
// reasoning tokens would otherwise count against max_tokens. Spread into a create() call.
export const NO_REASONING = { reasoning: { effort: "none" } } as Record<string, unknown>;
