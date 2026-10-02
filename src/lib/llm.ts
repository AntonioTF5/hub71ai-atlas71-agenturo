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

// OpenRouter's unified reasoning switch. Sonnet 5.5 always reasons ("cannot be disabled"), so keep it
// minimal: the agent needs quick tool calls, and reasoning tokens count against max_tokens.
// Spread into a create() call and leave max_tokens generous.
export const LIGHT_REASONING = { reasoning: { effort: "minimal" } } as Record<string, unknown>;
