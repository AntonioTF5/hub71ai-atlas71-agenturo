// Chat uploads in Vercel Blob are public, so none may outlive its turn for long. /api/agent deletes a
// turn's files once it's answered; this sweep removes what failed, abandoned or never-sent turns left
// behind (a removed photo, a closed tab). It runs after every upload token and agent request, at most once
// every few minutes per instance, and pages through the whole store. Server only.
import { del, list } from "@vercel/blob";
import { UPLOAD_PREFIX } from "@/lib/atlas/attachments";

/** Uploads whose turn failed or was abandoned are kept for Retry; anything older than this is swept. */
const STALE_UPLOAD_MS = 2 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 5 * 60 * 1000;
/** Blob lists at most 1,000 per page; past 20 pages the next sweep carries on. */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

let lastSweep = 0;

export async function sweepStaleUploads(): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  const now = Date.now();
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  const cutoff = now - STALE_UPLOAD_MS;
  try {
    const stale: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const r = await list({ prefix: UPLOAD_PREFIX, limit: PAGE_SIZE, cursor });
      for (const b of r.blobs) if (new Date(b.uploadedAt).getTime() < cutoff) stale.push(b.url);
      if (!r.hasMore || !r.cursor) break;
      cursor = r.cursor;
    }
    for (let i = 0; i < stale.length; i += PAGE_SIZE) await del(stale.slice(i, i + PAGE_SIZE));
  } catch (err) {
    console.error("Upload sweep failed:", err instanceof Error ? err.message : "unknown error");
  }
}
