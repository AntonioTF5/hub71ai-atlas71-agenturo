import { AGENT_MODEL } from "@/lib/llm";
import { typesafe } from "@/lib/typesafe";

export const dynamic = "force-dynamic";

// Checks each provider key without exposing it: is it set, does it look right, does the provider accept it.
function describe(key: string | undefined) {
  if (!key) return { set: false };
  return {
    set: true,
    looksLikeOpenRouterKey: key.trim().startsWith("sk-or-"),
    hasQuotesOrWhitespace: /["'\s]/.test(key),
  };
}

async function checkOpenRouter() {
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  };
  try {
    // Free endpoint that returns info about the calling key; only non-identifying fields are passed on.
    const keyRes = await fetch("https://openrouter.ai/api/v1/key", { headers, cache: "no-store" });
    if (!keyRes.ok) return { ok: false, error: `${keyRes.status} ${await keyRes.text()}` };
    const { is_management_key, is_free_tier, limit_remaining, usage } = (await keyRes.json()).data ?? {};
    const keyInfo = { is_management_key, is_free_tier, limit_remaining, usage };
    if (is_management_key) {
      return { ok: false, keyInfo, error: "This is a management key; completions need a regular API key." };
    }

    // A key can pass /key yet still be refused for completions, so try a 1-token call.
    const chatRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ model: AGENT_MODEL, max_tokens: 16, messages: [{ role: "user", content: "hi" }] }),
    });
    const completion = chatRes.ok ? "ok" : `${chatRes.status} ${await chatRes.text()}`;
    return { ok: chatRes.ok, model: AGENT_MODEL, keyInfo, completion };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function checkTypeSafe() {
  try {
    const models = await typesafe().models.list();
    return { ok: true, models: models.map((m) => m.name) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function GET() {
  const [openrouter, ts] = await Promise.all([checkOpenRouter(), checkTypeSafe()]);
  const body = {
    openrouter: { ...describe(process.env.OPENROUTER_API_KEY), ...openrouter },
    typesafe: { ...describe(process.env.TYPESAFE_API_KEY), ...ts },
  };
  return Response.json(body, { status: openrouter.ok && ts.ok ? 200 : 503 });
}
