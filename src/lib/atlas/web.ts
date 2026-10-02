// Pure helpers for the agent's web tools (web_search and fetch_url, both through Tavily, which fetches
// pages on its side): the URL check, labels for the activity rows, and the honest errors the model gets
// when the web can't be reached. No "@/" imports, so node --test can load it.
import type { TavilyErrorCode } from "../tavily.ts";

export const MAX_URL_CHARS = 2000;
/** Page text handed to the model from one fetch_url. */
export const MAX_PAGE_CHARS = 10_000;
/** Web lookups (searches and page reads together) in one response, so a looping model can't burn the quota. */
export const MAX_WEB_CALLS = 6;

/** A URL the model asked to read: http(s) only and a sane length. A bare domain ("routely.io") gets https://. */
export function checkWebUrl(raw: unknown): { url: string } | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { error: "url must be a web address." };
  let s = raw.trim();
  if (s.length > MAX_URL_CHARS) return { error: "That URL is too long." };
  // "scheme:" stays as written (and fails below unless it's http or https); "host:port" is a bare domain.
  if (!/^[a-z][a-z\d+.-]*:(?!\d)/i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { error: "That isn't a valid URL." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Only http and https pages can be read." };
  u.hash = "";
  return { url: u.toString() };
}

const HOST_LIKE = /(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z][a-z\d-]{1,62}/gi;

/** Hosts written in text: URLs, bare domains ("routely.io") and email domains, lowercased and without "www.". */
export function namedHosts(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    for (const m of text.matchAll(HOST_LIKE)) {
      try {
        out.add(new URL(`https://${m[0]}`).hostname.replace(/^www\./, ""));
      } catch {
        // not a host after all
      }
    }
  }
  return out;
}

/**
 * fetch_url reads only pages with a known source, so text in a page or a document can't make the model
 * send case data to an address of its choosing: a host the founder wrote, a trusted host, or the exact
 * URL a search returned (all checked with checkWebUrl first).
 */
export function mayRead(url: string, allowed: { hosts: Set<string>; urls: Set<string> }): boolean {
  if (allowed.urls.has(url)) return true;
  try {
    return allowed.hosts.has(new URL(url).hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

/** "adgm.com" for "https://www.adgm.com/fees": the host without "www.". */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the page";
  }
}

/** "adgm.com, u.ae, icp.gov.ae +2" for the activity row: unique hosts in order. */
export function domainList(urls: string[], max = 3): string {
  const hosts = [...new Set(urls.map(hostLabel))];
  return hosts.length > max ? `${hosts.slice(0, max).join(", ")} +${hosts.length - max}` : hosts.join(", ");
}

/** Search results unique by URL (ignoring the #fragment), at most `max`. */
export function uniqueByUrl<T extends { url: string }>(items: T[], max = 6): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.url.replace(/#.*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, max);
}

/** A PDF by its path (the query string doesn't count), or because the failed read said so. */
export function looksLikePdf(url: string, failure?: string): boolean {
  try {
    if (new URL(url).pathname.toLowerCase().endsWith(".pdf")) return true;
  } catch {
    // not a URL: only the failure text can tell
  }
  return !!failure && /\bpdf\b/i.test(failure);
}

/** The file name the model sees for a PDF read by URL. */
export function pdfFileName(url: string): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
    const clean = last.replace(/[^\p{L}\p{N} ._()-]+/gu, "_").slice(0, 100);
    if (!clean.replace(/[._\s]/g, "")) return "document.pdf";
    return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
  } catch {
    return "document.pdf";
  }
}

/** What the model is told when a web lookup fails: short, honest, and what to do instead. */
export function webError(code: TavilyErrorCode | undefined, kind: "search" | "read"): string {
  switch (code) {
    case "not_configured":
      return `${kind === "search" ? "Web search" : "Reading web pages"} isn't set up on this deployment. Answer from the knowledge base and tell the founder you couldn't check the web.`;
    case "unauthorized":
      return "The web search service refused this deployment's key. Answer from the knowledge base and say the web check didn't run.";
    case "limit":
      return "The web search quota is used up for now. Answer from the knowledge base and say the web check didn't run.";
    case "bad_request":
      return kind === "search"
        ? "The search service rejected that query. Shorten it and try once more, or answer from the knowledge base."
        : "The reader couldn't take that address. Check the URL, or search for the page instead.";
    default:
      return kind === "search"
        ? "The web search didn't answer. Answer from the knowledge base, say so, and offer to try again."
        : "That page couldn't be read (it may block readers or need a login). Say so, and search for the facts instead.";
  }
}

/** The activity row's last word when a lookup fails. */
export function webFailureRow(code: TavilyErrorCode | undefined, fallback: string): string {
  if (code === "not_configured") return "The web isn't set up here";
  if (code === "limit") return "Web search limit reached";
  if (code === "unauthorized") return "Web search is unavailable";
  return fallback;
}
