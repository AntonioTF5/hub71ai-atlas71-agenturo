import { AGENT_MODEL } from "@/lib/llm";
import { tavilyConfigured } from "@/lib/tavily";

export const dynamic = "force-dynamic";

// Which commit is serving: lets a deploy script wait for the new build without a Vercel token.
// blob and tavily say whether file uploads and the web tools are set up (booleans only, never the keys).
export function GET() {
  return Response.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    model: AGENT_MODEL,
    blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    tavily: tavilyConfigured(),
  });
}
