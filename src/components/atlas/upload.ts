// Uploading an attached file straight to Vercel Blob: /api/upload hands out a scoped client token, the
// bytes go from the browser to Blob, and only the URL travels with the message. When the deployment has
// no Blob store, /api/upload answers 503 storage_not_configured: that's remembered for this page load,
// so later files go inline at once instead of trying again. The Blob client loads with the first upload.
import { UPLOAD_PREFIX } from "@/lib/atlas/attachments";

const HANDLE_UPLOAD_URL = "/api/upload";
/** Bigger files upload in parallel parts, each retried on its own. */
const MULTIPART_FROM_BYTES = 5 * 1024 * 1024;

let storage: "unknown" | "available" | "unavailable" = "unknown";
/**
 * Until the page knows, one upload finds out (its first progress event means the token came through)
 * and files picked with it wait, instead of each asking /api/upload and failing the same way.
 */
let learning: Promise<void> | null = null;

/** True once /api/upload said there's no Blob store. */
export const storageUnavailable = () => storage === "unavailable";

/** The deployment has no Blob store: send the file inline instead. */
export class StorageUnavailableError extends Error {
  constructor() {
    super("storage_not_configured");
    this.name = "StorageUnavailableError";
  }
}

function shortId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

/** A short random prefix keeps two files with the same name apart; the rest is a URL-safe slug. */
function blobPathname(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  const base =
    (dot > 0 ? name.slice(0, dot) : name)
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/\.{2,}/g, ".") // /api/upload refuses ".." anywhere in the path
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 60) || "file";
  return `${UPLOAD_PREFIX}${shortId()}-${base}${ext ? `.${ext}` : ""}`;
}

/**
 * upload() only says it couldn't get a token. Ask once more, the same way, to learn why: 503
 * storage_not_configured (or no route at all) means this deployment has no Blob store.
 */
async function noBlobStore(pathname: string, multipart: boolean): Promise<boolean> {
  try {
    const res = await fetch(HANDLE_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname, clientPayload: null, multipart } }),
      cache: "no-store",
    });
    if (res.status === 404) return true;
    if (res.status !== 503) return false;
    const data: unknown = await res.json().catch(() => null);
    return !!data && typeof data === "object" && (data as { error?: unknown }).error === "storage_not_configured";
  } catch {
    return false;
  }
}

/**
 * Uploads one file and returns its Blob URL. Throws StorageUnavailableError when there's no Blob store,
 * the abort reason when `signal` fires (the founder removed the file), or the upload error otherwise.
 */
export async function uploadToBlob(
  name: string,
  body: Blob,
  contentType: string,
  { signal, onProgress }: { signal: AbortSignal; onProgress: (percent: number) => void },
): Promise<string> {
  while (storage === "unknown" && learning) await learning;
  signal.throwIfAborted();
  if (storage === "unavailable") throw new StorageUnavailableError();
  let learned = () => {};
  if (storage === "unknown") {
    const gate = new Promise<void>((resolve) => {
      learned = () => {
        if (learning === gate) learning = null;
        resolve();
      };
    });
    learning = gate;
  }
  const pathname = blobPathname(name);
  const multipart = body.size > MULTIPART_FROM_BYTES;
  try {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(pathname, body, {
      access: "public",
      handleUploadUrl: HANDLE_UPLOAD_URL,
      contentType,
      multipart,
      abortSignal: signal,
      onUploadProgress: ({ percentage }) => {
        if (storage === "unknown") storage = "available";
        learned();
        onProgress(percentage);
      },
    });
    storage = "available";
    return blob.url;
  } catch (err) {
    signal.throwIfAborted();
    const tokenFailed = err instanceof Error && /client token/i.test(err.message);
    if (tokenFailed && storage === "unknown" && (await noBlobStore(pathname, multipart))) {
      storage = "unavailable";
      throw new StorageUnavailableError();
    }
    throw err;
  } finally {
    learned();
  }
}
