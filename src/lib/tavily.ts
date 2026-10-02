// Tavily: web search and page extraction for the agent's web tools. Server only; reads TAVILY_API_KEY
// (or TAVILY_API). Tavily fetches pages on its side, so Atlas71's server never requests arbitrary URLs.
// Docs: https://docs.tavily.com/documentation/api-reference/endpoint/search and .../extract
const BASE = "https://api.tavily.com";

function apiKey(): string | null {
  return (process.env.TAVILY_API_KEY ?? process.env.TAVILY_API)?.trim() || null;
}

export function tavilyConfigured(): boolean {
  return apiKey() !== null;
}

export type TavilyErrorCode = "not_configured" | "unauthorized" | "limit" | "bad_request" | "unavailable";

export class TavilyError extends Error {
  readonly code: TavilyErrorCode;
  readonly status?: number;
  /** Tavily's own reason, when it gave one (why an extract failed). */
  readonly detail?: string;
  constructor(code: TavilyErrorCode, status?: number, detail?: string) {
    super(`Tavily ${code}${status ? ` (${status})` : ""}`);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

async function post<T>(path: string, body: Record<string, unknown>, timeoutMs: number): Promise<T> {
  const key = apiKey();
  if (!key) throw new TavilyError("not_configured");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    throw new TavilyError("unavailable");
  }
  if (!res.ok) {
    // 401 bad key; 429 rate limit; 432/433 plan or pay-as-you-go limit; 400 bad request
    const code: TavilyErrorCode =
      res.status === 401 || res.status === 403
        ? "unauthorized"
        : res.status === 429 || res.status === 432 || res.status === 433
          ? "limit"
          : res.status === 400
            ? "bad_request"
            : "unavailable";
    throw new TavilyError(code, res.status);
  }
  return (await res.json()) as T;
}

const isHttpUrl = (u: unknown): u is string => {
  if (typeof u !== "string") return false;
  try {
    const p = new URL(u).protocol;
    return p === "https:" || p === "http:";
  } catch {
    return false;
  }
};

export interface SearchHit {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
}

export interface SearchResult {
  answer: string | null;
  results: SearchHit[];
}

export async function tavilySearch(
  query: string,
  opts: {
    maxResults?: number;
    depth?: "basic" | "advanced";
    topic?: "general" | "news";
    includeDomains?: string[];
    /** At most 15 s; the agent passes less when its reply is short on time. */
    timeoutMs?: number;
  } = {},
): Promise<SearchResult> {
  const max = Math.min(10, Math.max(1, opts.maxResults ?? 5));
  const r = await post<{
    answer?: unknown;
    results?: { title?: unknown; url?: unknown; content?: unknown; score?: unknown; published_date?: unknown }[];
  }>(
    "/search",
    {
      query: query.trim().slice(0, 400),
      search_depth: opts.depth ?? "basic",
      topic: opts.topic ?? "general",
      max_results: max,
      include_answer: "basic",
      include_raw_content: false,
      ...(opts.includeDomains?.length ? { include_domains: opts.includeDomains.slice(0, 20) } : {}),
    },
    Math.min(15_000, opts.timeoutMs ?? 15_000),
  );
  const results: SearchHit[] = (Array.isArray(r.results) ? r.results : [])
    .filter((h) => isHttpUrl(h.url))
    .map((h) => ({
      title: typeof h.title === "string" && h.title.trim() ? h.title.trim().slice(0, 200) : new URL(h.url as string).hostname,
      url: h.url as string,
      content: typeof h.content === "string" ? h.content.trim().slice(0, 1200) : "",
      score: typeof h.score === "number" ? h.score : undefined,
      publishedDate: typeof h.published_date === "string" ? h.published_date : undefined,
    }))
    .slice(0, max);
  return { answer: typeof r.answer === "string" && r.answer.trim() ? r.answer.trim().slice(0, 2000) : null, results };
}

export interface ExtractResult {
  url: string;
  content: string;
  truncated: boolean;
}

/**
 * Page content as markdown. With `query`, Tavily returns the chunks most relevant to it. `timeoutMs` (at most
 * 25 s) bounds the whole call; Tavily's own fetch gets a little less. Throws on failure.
 */
export async function tavilyExtract(
  url: string,
  opts: { query?: string; maxChars?: number; timeoutMs?: number } = {},
): Promise<ExtractResult> {
  if (!isHttpUrl(url)) throw new TavilyError("bad_request");
  const maxChars = opts.maxChars ?? 12_000;
  const timeoutMs = Math.min(25_000, opts.timeoutMs ?? 25_000);
  const r = await post<{
    results?: { url?: unknown; raw_content?: unknown }[];
    failed_results?: { url?: unknown; error?: unknown }[];
  }>(
    "/extract",
    {
      urls: [url],
      extract_depth: "basic",
      format: "markdown",
      timeout: Math.min(20, Math.max(3, Math.floor(timeoutMs / 1000) - 2)),
      ...(opts.query?.trim() ? { query: opts.query.trim().slice(0, 300), chunks_per_source: 5 } : {}),
    },
    timeoutMs,
  );
  // Partial failures come back as HTTP 200, so check both arrays.
  const hit = (Array.isArray(r.results) ? r.results : []).find((x) => typeof x.raw_content === "string" && x.raw_content.trim());
  if (!hit) {
    const reason = (Array.isArray(r.failed_results) ? r.failed_results : []).find((x) => typeof x.error === "string")?.error;
    throw new TavilyError("unavailable", undefined, typeof reason === "string" ? reason.slice(0, 200) : undefined);
  }
  const text = (hit.raw_content as string).replace(/\n{3,}/g, "\n\n").trim();
  return {
    url: isHttpUrl(hit.url) ? hit.url : url,
    content: text.slice(0, maxChars),
    truncated: text.length > maxChars,
  };
}
