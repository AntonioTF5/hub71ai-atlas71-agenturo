// Getting picked, pasted or dropped files ready to send: photos and PDFs up to 20 MB each. Photos are
// decoded and compressed here (canvas → WebP or JPEG, longest side 2000 px; an HEIC/HEIF photo the
// browser can't open is converted to JPEG first). Then the file uploads to Vercel Blob and the message
// carries its URL. With no Blob store it goes inline instead: the photo as a data URL, a PDF as its
// text or, for a scan, its first pages as JPEG, all within the request's inline budget.
import {
  MAX_ATTACHMENT_BYTES,
  MAX_INLINE_TOTAL_BYTES,
  MAX_PDF_PAGE_IMAGES,
  MAX_UPLOAD_BYTES,
  dataUrlBytes,
  type Attachment,
} from "@/lib/atlas/attachments";
import { PdfReadError, readPdf, textBytes, type PdfContent } from "./pdf";
import { StorageUnavailableError, storageUnavailable, uploadToBlob } from "./upload";

export type FileKind = "image" | "pdf";

export interface PendingFile {
  id: string;
  kind: FileKind;
  /** As sent: a converted photo gets its new extension. */
  name: string;
  mime: string;
  /** Bytes as picked. */
  size: number;
  stage: "preparing" | "uploading" | "ready";
  /** What "preparing" is doing right now. */
  activity?: string;
  /** 0–100 while uploading. */
  progress: number;
  /** Bytes going out: the compressed photo, the PDF as it is, or what travels inline. */
  bytes: number;
  /** A small JPEG thumbnail (data URL) for photos; null for PDFs. */
  preview: string | null;
  /** The request part, once ready. */
  attachment?: Attachment;
  /** The ready state in words: "Uploaded · 12.4 MB", "Read in your browser · 14 pages". */
  note?: string;
  /** Said on hover when part of the file was left out. */
  hint?: string;
}

/** A failure the founder should read, worded for them. */
export class FileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileError";
  }
}

export interface PrepareContext {
  signal: AbortSignal;
  update: (patch: Partial<PendingFile>) => void;
  /**
   * Runs inline work one file at a time. `room(need)` answers how many inline bytes this file may use,
   * after trying to free at least `need` by trimming pages off other scans.
   */
  inline: <T>(work: (room: (need: number) => number) => Promise<T>) => Promise<T>;
}

const PHOTO_MAX_SIDE = 2000;
const PHOTO_QUALITY = 0.82;
/** Smaller tries when a photo has to fit the inline budget: [longest side, quality]. */
const PHOTO_SMALLER: [number, number][] = [
  [1600, 0.78],
  [1280, 0.72],
  [1024, 0.66],
  [800, 0.6],
];
/** What an inline photo may claim from other scans' pages; past that it's compressed harder instead. */
const PHOTO_INLINE_FLOOR = 300_000;
const THUMB_SIDE = 240;
/** Already light enough to send untouched. JPEGs are always re-encoded, which drops EXIF and location. */
const KEEP_AS_IS = new Set(["image/png", "image/webp", "image/gif"]);
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp|heic|heif)$/i;
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);
const HEIC_UNSUPPORTED = "This photo format isn't supported here; export it as JPEG.";

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

export function newFileId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Sync checks before anything is read: type and size. */
export function checkFile(file: File): { ok: true; kind: FileKind; name: string } | { ok: false; error: string } {
  const name = (file.name || "file").slice(0, 120);
  const type = (file.type || "").toLowerCase();
  const kind: FileKind | null =
    type === "application/pdf" || /\.pdf$/i.test(name) ? "pdf" : type.startsWith("image/") || IMAGE_EXT.test(name) ? "image" : null;
  if (!kind) return { ok: false, error: `${name} isn't supported. Attach a PDF or a photo.` };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `${name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)} per file.` };
  }
  if (!file.size) return { ok: false, error: `${name} is empty.` };
  return { ok: true, kind, name };
}

/** Inline bytes an attachment adds to the request: images and page renders decoded, text as UTF-8. */
export function inlineBytes(a: Attachment | undefined): number {
  if (!a) return 0;
  if (a.dataUrl) return dataUrlBytes(a.dataUrl);
  if (a.pages) return a.pages.reduce((sum, p) => sum + dataUrlBytes(p), 0);
  if (a.text) return textBytes(a.text);
  return 0;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The ready note for a PDF read in the browser: which pages travel, out of how many. */
export function pdfNote(a: Attachment, textPages?: number): Pick<PendingFile, "note" | "hint"> {
  const total = a.pageCount ?? 0;
  const sent = a.pages ? a.pages.length : (textPages ?? total);
  if (!total || sent >= total) return { note: `Read in your browser · ${plural(total || sent, "page")}`, hint: undefined };
  return {
    note: `Read in your browser · ${sent} of ${plural(total, "page")}`,
    hint: !a.pages
      ? `It's long: Atlas71 reads the first ${plural(sent, "page")}.`
      : sent >= MAX_PDF_PAGE_IMAGES
        ? `Atlas71 reads the first ${MAX_PDF_PAGE_IMAGES} pages of a scan.`
        : `Only the first ${plural(sent, "page")} fit in one message.`,
  };
}

/**
 * Inline bytes free for one file. When that's under `need`, the last pages come off other scans (at
 * least one page stays) until it isn't. Returns the files as they should now be.
 */
export function makeInlineRoom(files: PendingFile[], forId: string, need: number): { free: number; files: PendingFile[] } {
  let free = MAX_INLINE_TOTAL_BYTES - files.reduce((sum, f) => (f.id === forId ? sum : sum + inlineBytes(f.attachment)), 0);
  if (free >= need) return { free, files };
  const next = files.slice();
  for (let i = next.length - 1; i >= 0 && free < need; i--) {
    const f = next[i];
    const a = f.attachment;
    if (f.id === forId || !a?.pages || a.pages.length < 2) continue;
    const pages = a.pages.slice();
    while (pages.length > 1 && free < need) {
      const last = pages.pop();
      if (last) free += dataUrlBytes(last);
    }
    const attachment = { ...a, pages };
    next[i] = { ...f, attachment, bytes: inlineBytes(attachment), ...pdfNote(attachment) };
  }
  return { free: Math.max(0, free), files: next };
}

// ---------- photos ----------

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

/** Opens an image the way the browser can (EXIF orientation applied), or null. */
async function decode(blob: Blob): Promise<Decoded | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      if (bmp.width && bmp.height) return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
      bmp.close();
    } catch {
      // older Safari, or a format only <img> knows: try that
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new window.Image();
  img.decoding = "async";
  img.src = url;
  try {
    await img.decode();
    if (img.naturalWidth && img.naturalHeight) {
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
    }
  } catch {
    // can't decode it
  }
  URL.revokeObjectURL(url);
  return null;
}

/** HEIC/HEIF by type, extension or the ftyp brand in the first bytes (some pickers report no type). */
async function isHeif(file: File, name: string): Promise<boolean> {
  if (/^image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(name)) return true;
  try {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const box = String.fromCharCode(...head.subarray(4, 12));
    return box.startsWith("ftyp") && HEIF_BRANDS.has(box.slice(4));
  } catch {
    return false;
  }
}

/** Chrome on macOS can't open HEIC: heic2any (loaded only now) converts it to JPEG. */
async function heicToJpeg(file: Blob): Promise<Blob | null> {
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(out) ? out[0] : out;
    return blob instanceof Blob && blob.size ? blob : null;
  } catch {
    return null;
  }
}

/** Draws onto a white canvas, scaled so the longest side is at most `maxSide`. */
function draw(source: CanvasImageSource, width: number, height: number, maxSide: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas");
  ctx.fillStyle = "#ffffff"; // transparent PNGs flatten onto white, not black, as JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b && b.type === type ? b : null), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/** WebP or JPEG at `quality`, whichever is smaller. Safari can't encode WebP (it hands back PNG): skipped. */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const [webp, jpeg] = await Promise.all([toBlob(canvas, "image/webp", quality), toBlob(canvas, "image/jpeg", quality)]);
  const best = webp && (!jpeg || webp.size < jpeg.size) ? webp : jpeg;
  if (!best) throw new Error("canvas encode failed");
  return best;
}

function thumbnail(canvas: HTMLCanvasElement): string {
  const small = draw(canvas, canvas.width, canvas.height, THUMB_SIDE);
  const url = small.toDataURL("image/jpeg", 0.8);
  small.width = small.height = 0;
  return url;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read failed")));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

function renameTo(name: string, mime: string): string {
  const ext = EXT[mime];
  if (!ext) return name;
  const base = name.replace(/\.[^./\\]+$/, "") || "photo";
  return `${base}.${ext}`;
}

/** The photo as a data URL within the room left: as compressed for upload if it fits, else smaller. */
async function fitInline(canvas: HTMLCanvasElement, blob: Blob, name: string, room: (need: number) => number): Promise<string> {
  const limit = Math.min(MAX_ATTACHMENT_BYTES, room(Math.min(blob.size, PHOTO_INLINE_FLOOR)));
  if (blob.size <= limit) return readAsDataUrl(blob);
  for (const [side, quality] of PHOTO_SMALLER) {
    const small = draw(canvas, canvas.width, canvas.height, side);
    try {
      const smaller = await encode(small, quality);
      if (smaller.size <= limit) return readAsDataUrl(smaller);
    } finally {
      small.width = small.height = 0;
    }
  }
  throw new FileError(`There's no room left in this message for ${name}. Send it on its own.`);
}

async function prepareImage(file: File, name: string, ctx: PrepareContext): Promise<void> {
  const { signal, update } = ctx;
  let decoded = await decode(file);
  if (!decoded) {
    if (!(await isHeif(file, name))) throw new FileError(`Couldn't open ${name}. Try a JPEG or PNG.`);
    update({ activity: "Converting photo…" });
    const jpeg = await heicToJpeg(file);
    signal.throwIfAborted();
    decoded = jpeg ? await decode(jpeg) : null;
    if (!decoded) throw new FileError(HEIC_UNSUPPORTED);
  }
  signal.throwIfAborted();
  const fitsAsIs = decoded.width <= PHOTO_MAX_SIDE && decoded.height <= PHOTO_MAX_SIDE;
  let canvas: HTMLCanvasElement;
  try {
    canvas = draw(decoded.source, decoded.width, decoded.height, PHOTO_MAX_SIDE);
  } finally {
    decoded.close();
  }
  try {
    update({ preview: thumbnail(canvas), activity: "Compressing…" });
    let blob: Blob = await encode(canvas, PHOTO_QUALITY);
    if (KEEP_AS_IS.has(file.type) && fitsAsIs && file.size <= blob.size) blob = file;
    signal.throwIfAborted();
    const mime = blob.type;
    const sentName = renameTo(name, mime);
    update({ name: sentName, mime, bytes: blob.size });

    if (!storageUnavailable()) {
      update({ stage: "uploading", progress: 0, activity: undefined });
      try {
        const url = await uploadToBlob(sentName, blob, mime, { signal, onProgress: (progress) => update({ progress }) });
        update({ stage: "ready", attachment: { name: sentName, mime, size: file.size, url }, note: `Uploaded · ${formatBytes(blob.size)}` });
        return;
      } catch (err) {
        signal.throwIfAborted();
        if (!(err instanceof StorageUnavailableError)) console.warn("[atlas71] upload failed; sending the photo inline", err);
        update({ stage: "preparing", activity: "Compressing…" });
      }
    }

    const dataUrl = await ctx.inline((room) => {
      signal.throwIfAborted();
      return fitInline(canvas, blob, name, room);
    });
    signal.throwIfAborted();
    const inlineMime = dataUrl.slice(5, dataUrl.indexOf(";"));
    const inlineName = renameTo(name, inlineMime);
    const bytes = dataUrlBytes(dataUrl);
    update({
      stage: "ready",
      name: inlineName,
      mime: inlineMime,
      bytes,
      attachment: { name: inlineName, mime: inlineMime, size: file.size, dataUrl },
      note: `Ready · ${formatBytes(bytes)}`,
    });
  } finally {
    canvas.width = canvas.height = 0;
  }
}

// ---------- PDFs ----------

const PDF_ERROR: Record<PdfReadError["reason"], (name: string) => string> = {
  password: (name) => `${name} is password-protected. Remove the password and attach it again.`,
  invalid: (name) => `Couldn't read ${name}. Is it a PDF?`,
  room: (name) => `There's no room left in this message for ${name}. Send it on its own.`,
};

async function looksLikePdf(file: File): Promise<boolean> {
  try {
    const head = await file.slice(0, 1024).text();
    return head.includes("%PDF-");
  } catch {
    return false;
  }
}

async function preparePdf(file: File, name: string, ctx: PrepareContext): Promise<void> {
  const { signal, update } = ctx;
  if (!(await looksLikePdf(file))) throw new FileError(PDF_ERROR.invalid(name));
  signal.throwIfAborted();

  if (!storageUnavailable()) {
    update({ stage: "uploading", progress: 0, bytes: file.size });
    try {
      const url = await uploadToBlob(name, file, "application/pdf", { signal, onProgress: (progress) => update({ progress }) });
      update({ stage: "ready", attachment: { name, mime: "application/pdf", size: file.size, url }, note: `Uploaded · ${formatBytes(file.size)}` });
      return;
    } catch (err) {
      signal.throwIfAborted();
      if (!(err instanceof StorageUnavailableError)) console.warn("[atlas71] upload failed; reading the PDF in the browser", err);
    }
  }

  update({ stage: "preparing", activity: "Reading in your browser…" });
  let content: PdfContent;
  try {
    const data = await file.arrayBuffer();
    content = await ctx.inline((room) => {
      signal.throwIfAborted();
      return readPdf(data, {
        signal,
        room,
        onStage: (stage) => update({ activity: stage === "scan" ? "Reading the scanned pages…" : "Reading in your browser…" }),
      });
    });
  } catch (err) {
    signal.throwIfAborted();
    if (err instanceof PdfReadError) throw new FileError(PDF_ERROR[err.reason](name));
    console.warn("[atlas71] couldn't read the PDF", err);
    throw new FileError(`Couldn't read ${name} here. Try again, or attach a photo of it.`);
  }
  signal.throwIfAborted();
  const attachment: Attachment = content.pages
    ? { name, mime: "application/pdf", size: file.size, pages: content.pages, pageCount: content.pageCount }
    : { name, mime: "application/pdf", size: file.size, text: content.text, pageCount: content.pageCount };
  update({ stage: "ready", attachment, bytes: inlineBytes(attachment), ...pdfNote(attachment, content.textPages) });
}

/**
 * Takes one checked file to ready: reports progress through `ctx.update` and resolves once the file
 * carries its `attachment`. Throws FileError (show it), or the abort reason when the founder removed it.
 */
export function prepareFile(file: File, kind: FileKind, name: string, ctx: PrepareContext): Promise<void> {
  return kind === "pdf" ? preparePdf(file, name, ctx) : prepareImage(file, name, ctx);
}
