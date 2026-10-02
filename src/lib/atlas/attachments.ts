// Files the founder attaches to a message: photos and PDFs up to 20 MB each.
// Preferred path: the browser uploads straight to Vercel Blob (POST /api/upload hands out a scoped token),
// the agent passes the file URL to the model, and the blob is deleted once that turn is answered.
// Fallback when no Blob store is configured (/api/upload answers 503 storage_not_configured): images are
// compressed in the browser and sent inline; PDFs are read in the browser (text, or rendered page images
// for scans), so the request stays under Vercel's 4.5 MB body limit.
// Only metadata stays in the chat history; the model reads a file once, in the turn it was attached.
import type { AgentRequest, ChatMessage } from "./types";

export const MAX_ATTACHMENTS = 3;
/** Per file, as picked (before any compression). */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
/** Every upload's pathname starts with this; /api/upload rejects anything else. */
export const UPLOAD_PREFIX = "atlas71/";
/** For <input type="file" accept>: lets iOS/macOS offer Photos, the camera and Files. */
export const ATTACHMENT_ACCEPT = "image/*,application/pdf";
/** What the model can read. HEIC/HEIF photos are converted to JPEG in the browser first. */
export const MODEL_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const ATTACHMENT_MIME = [...MODEL_IMAGE_MIME, "application/pdf"] as const;

// Inline fallback budget: decoded bytes across all inline parts of one request (images, page renders and
// PDF text). Base64 adds a third, so 2.6 MB becomes ~3.5 MB on the wire, leaving room for history and
// state under Vercel's 4.5 MB body limit.
export const MAX_INLINE_TOTAL_BYTES = 2_600_000;
/** Kept for the inline path: one compressed image. */
export const MAX_ATTACHMENT_BYTES = 1_500_000;
/** Kept for older callers. */
export const MAX_TOTAL_ATTACHMENT_BYTES = MAX_INLINE_TOTAL_BYTES;
/** PDF text extracted in the browser (fallback path), per PDF; counts toward MAX_INLINE_TOTAL_BYTES. */
export const MAX_PDF_TEXT_CHARS = 40_000;
/** Scanned PDF pages rendered as JPEG in the browser (fallback path). */
export const MAX_PDF_PAGE_IMAGES = 10;

export interface AttachmentMeta {
  name: string;
  mime: string;
  size: number; // bytes of the file as picked
}

/** One attached file in a request. Exactly one of url / dataUrl / text / pages is the content. */
export interface Attachment extends AttachmentMeta {
  /** Uploaded to Vercel Blob (preferred): an image or a PDF. */
  url?: string;
  /** Inline, compressed image ("data:image/...;base64,..."). */
  dataUrl?: string;
  /** Inline PDF text extracted in the browser. */
  text?: string;
  /** Inline PDF pages rendered as JPEG data URLs (for scans with no text layer). */
  pages?: string[];
  /** Pages in the PDF, when known. */
  pageCount?: number;
}

/** A chat message as the client stores it: the shared ChatMessage plus attachment metadata on user turns. */
export type ChatMessageWithFiles = ChatMessage & { attachments?: AttachmentMeta[] };

/** POST /api/agent body when the newest user message carries files. */
export type AgentRequestWithFiles = AgentRequest & { attachments?: Attachment[] };

/** Bytes encoded in a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
}

/** Only our own Blob uploads are passed to the model by URL. */
export function isOurBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".public.blob.vercel-storage.com") &&
      u.pathname.startsWith(`/${UPLOAD_PREFIX}`)
    );
  } catch {
    return false;
  }
}

export function attachmentNote(files: AttachmentMeta[]): string {
  return `(attached: ${files.map((f) => f.name).join(", ")})`;
}
