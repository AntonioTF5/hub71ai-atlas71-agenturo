import { AGENT_MODEL } from "@/lib/llm";

export const dynamic = "force-dynamic";

// Which commit is serving: lets a deploy script wait for the new build without a Vercel token.
export function GET() {
  return Response.json({ sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev", model: AGENT_MODEL });
}
