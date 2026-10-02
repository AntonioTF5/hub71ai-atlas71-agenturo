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
  try {
    // Free endpoint that returns info about the calling key.
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      cache: "no-store",
    });
    return res.ok ? { ok: true } : { ok: false, error: `${res.status} ${await res.text()}` };
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
