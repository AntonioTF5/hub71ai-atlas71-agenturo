// Reading a PDF in the browser, for when there's no Blob store to upload it to: the text of its pages
// (up to MAX_PDF_TEXT_CHARS) or, for a scan with almost no text, its first pages rendered as JPEG.
// pdf.js loads only when a PDF needs it; the legacy build also runs on older Safari and Chrome.
import { MAX_PDF_PAGE_IMAGES, MAX_PDF_TEXT_CHARS, dataUrlBytes } from "@/lib/atlas/attachments";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

/** Scan pages render about this wide, and never taller than PAGE_MAX_HEIGHT. */
const PAGE_WIDTH = 1400;
const PAGE_MAX_HEIGHT = 2000;
const PAGE_QUALITY = 0.7;
/** When a page doesn't fit the room left, it gets one smaller, softer try. */
const PAGE_RETRY_SCALE = 0.75;
const PAGE_RETRY_QUALITY = 0.55;
/** Fewer non-space characters than this per page, on average, and the PDF is a scan. */
const SCAN_CHARS_PER_PAGE = 50;
/** A long PDF with no text on its first pages is a scan: no need to read the rest. */
const SCAN_PROBE_PAGES = 8;

export interface PdfContent {
  pageCount: number;
  /** The text layer, with page markers when there's more than one page. */
  text?: string;
  /** Pages the text covers: fewer than pageCount when it hit MAX_PDF_TEXT_CHARS. */
  textPages?: number;
  /** A scan: the first pages as JPEG data URLs, as many as fit the room left in the message. */
  pages?: string[];
}

export class PdfReadError extends Error {
  constructor(readonly reason: "password" | "invalid" | "room") {
    super(reason);
    this.name = "PdfReadError";
  }
}

let loading: Promise<PdfJs> | null = null;

function pdfjs(): Promise<PdfJs> {
  loading ??= import("pdfjs-dist/legacy/build/pdf.mjs")
    .then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      return lib;
    })
    .catch((err: unknown) => {
      loading = null; // a flaky network gets another try with the next PDF
      throw err;
    });
  return loading;
}

/**
 * Black-and-white scans often use JBIG2 or CCITT fax images, and some JPEG 2000: pdf.js decodes those
 * with wasm it fetches through this factory (useWorkerFetch: false), from files bundled with the app.
 */
class WasmFiles {
  async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
    const url =
      kind !== "wasmUrl"
        ? null
        : filename === "jbig2.wasm"
          ? new URL("pdfjs-dist/wasm/jbig2.wasm", import.meta.url)
          : filename === "openjpeg.wasm"
            ? new URL("pdfjs-dist/wasm/openjpeg.wasm", import.meta.url)
            : null;
    if (!url) throw new Error(`${filename} isn't bundled`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${filename}: HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

const utf8 = new TextEncoder();

/** Bytes of text as it travels in the request. */
export function textBytes(text: string): number {
  return utf8.encode(text).length;
}

function pageText(items: readonly unknown[]): string {
  let out = "";
  for (const item of items) {
    if (!item || typeof item !== "object" || !("str" in item)) continue;
    const { str, hasEOL } = item as { str: string; hasEOL?: boolean };
    out += str + (hasEOL ? "\n" : "");
  }
  return out
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function nonSpace(text: string): number {
  return text.replace(/\s+/g, "").length;
}

function renderedJpeg(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Reads the PDF. `room(need)` answers how many inline bytes this file may use, after trying to free at
 * least `need` (another scan can give up its last pages). Throws PdfReadError when the file is
 * password-protected, isn't a PDF, or not even one page fits.
 */
export async function readPdf(
  data: ArrayBuffer,
  { signal, room, onStage }: { signal: AbortSignal; room: (need: number) => number; onStage: (stage: "text" | "scan") => void },
): Promise<PdfContent> {
  const lib = await pdfjs();
  signal.throwIfAborted();
  const task = lib.getDocument({
    data: new Uint8Array(data),
    verbosity: lib.VerbosityLevel.ERRORS,
    useWorkerFetch: false,
    BinaryDataFactory: WasmFiles,
  });
  const stop = () => void task.destroy();
  signal.addEventListener("abort", stop, { once: true });
  try {
    let doc: Awaited<typeof task.promise>;
    try {
      doc = await task.promise;
    } catch (err) {
      signal.throwIfAborted();
      const name = err instanceof Error ? err.name : "";
      throw new PdfReadError(name === "PasswordException" ? "password" : "invalid");
    }
    const pageCount = doc.numPages;
    if (!pageCount) throw new PdfReadError("invalid");

    // 1. The text layer, page by page, until the limit.
    onStage("text");
    let text = "";
    let chars = 0;
    let read = 0;
    for (let n = 1; n <= pageCount; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      page.cleanup();
      signal.throwIfAborted();
      const t = pageText(content.items);
      chars += nonSpace(t);
      read = n;
      if (t) text += `${text ? "\n\n" : ""}${pageCount > 1 ? `[Page ${n}]\n` : ""}${t}`;
      if (text.length >= MAX_PDF_TEXT_CHARS) break;
      if (n >= SCAN_PROBE_PAGES && chars < SCAN_CHARS_PER_PAGE * n) break;
    }

    if (chars >= SCAN_CHARS_PER_PAGE * read) {
      text = text.slice(0, MAX_PDF_TEXT_CHARS);
      const fits = room(textBytes(text));
      // Text is small next to the image budget; this only bites beside two full scans.
      while (text && textBytes(text) > fits) text = text.slice(0, Math.floor(text.length * 0.9));
      if (!text) throw new PdfReadError("room");
      return { pageCount, text, textPages: read };
    }

    // 2. A scan: render the first pages as JPEG, as many as fit.
    onStage("scan");
    const pages: string[] = [];
    let left = 0;
    for (let n = 1; n <= Math.min(pageCount, MAX_PDF_PAGE_IMAGES); n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(PAGE_WIDTH / base.width, PAGE_MAX_HEIGHT / base.height);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      try {
        await page.render({ canvas, viewport, background: "#ffffff" }).promise;
        signal.throwIfAborted();
        let jpeg = renderedJpeg(canvas, PAGE_QUALITY);
        let bytes = dataUrlBytes(jpeg);
        // The first page may claim room from another scan; later pages only use what's left.
        if (n === 1) left = room(bytes);
        if (bytes > left) {
          const small = document.createElement("canvas");
          small.width = Math.max(1, Math.round(canvas.width * PAGE_RETRY_SCALE));
          small.height = Math.max(1, Math.round(canvas.height * PAGE_RETRY_SCALE));
          const ctx = small.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(canvas, 0, 0, small.width, small.height);
            jpeg = renderedJpeg(small, PAGE_RETRY_QUALITY);
            bytes = dataUrlBytes(jpeg);
          }
          small.width = small.height = 0;
        }
        if (bytes > left) break;
        pages.push(jpeg);
        left -= bytes;
      } finally {
        page.cleanup();
        canvas.width = canvas.height = 0; // let the browser drop the bitmap now, not at GC
      }
    }
    if (!pages.length) throw new PdfReadError("room");
    return { pageCount, pages };
  } finally {
    signal.removeEventListener("abort", stop);
    void task.destroy();
  }
}
