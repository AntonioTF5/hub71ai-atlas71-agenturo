// Turning picked, pasted or dropped files into inline attachments: images are compressed in the
// browser (canvas → WebP or JPEG, at most 1400px), PDFs go as they are. Nothing is uploaded until send.
import {
  MAX_ATTACHMENT_BYTES,
  dataUrlBytes,
  type Attachment,
} from "@/lib/atlas/attachments";

export interface PendingFile extends Attachment {
  id: string;
  /** A data URL thumbnail for images; null for PDFs. */
  preview: string | null;
}

export type Prepared = { ok: true; file: PendingFile } | { ok: false; error: string };

export function formatBytes(n: number): string {
  if (n < 1_000_000) return `${Math.max(1, Math.round(n / 1000))} KB`;
  return `${(n / 1_000_000).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read failed")));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Compress an image client-side. Falls back to the original when the browser can't decode it. */
function compressImage(dataUrl: string, maxDim = 1400, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) {
        resolve(dataUrl);
        return;
      }
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = "#ffffff"; // transparent PNGs flatten onto white, not black, as JPEG
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const webp = canvas.toDataURL("image/webp", quality);
      resolve(webp.startsWith("data:image/webp") && webp.length < dataUrl.length ? webp : canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function renameTo(name: string, mime: string): string {
  const ext = EXT[mime];
  if (!ext) return name;
  const base = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.${ext}`;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export async function prepareFile(file: File): Promise<Prepared> {
  const name = (file.name || "file").slice(0, 120);
  const type = (file.type || "").toLowerCase();
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
  const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/i.test(name);

  if (isPdf) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: `${name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)} per file.` };
    }
    let dataUrl: string;
    try {
      dataUrl = await readAsDataUrl(file);
    } catch {
      return { ok: false, error: `Couldn't read ${name}. Try again.` };
    }
    // Some browsers report an empty type: make sure the server sees a PDF data URL.
    const comma = dataUrl.indexOf(",");
    dataUrl = `data:application/pdf;base64,${dataUrl.slice(comma + 1)}`;
    return {
      ok: true,
      file: { id: newId(), name, mime: "application/pdf", size: dataUrlBytes(dataUrl), dataUrl, preview: null },
    };
  }

  if (isImage) {
    let raw: string;
    try {
      raw = await readAsDataUrl(file);
    } catch {
      return { ok: false, error: `Couldn't read ${name}. Try again.` };
    }
    const compressed = await compressImage(raw);
    const m = /^data:(image\/(?:png|jpeg|webp));base64,/i.exec(compressed);
    if (!m) return { ok: false, error: `Couldn't read ${name}. Try a JPEG or PNG.` };
    const mime = m[1].toLowerCase();
    const size = dataUrlBytes(compressed);
    if (size > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: `${name} is ${formatBytes(size)} even after compression. The limit is ${formatBytes(MAX_ATTACHMENT_BYTES)}.` };
    }
    return {
      ok: true,
      file: { id: newId(), name: renameTo(name, mime), mime, size, dataUrl: compressed, preview: compressed },
    };
  }

  return { ok: false, error: `${name} isn't supported. Attach a PDF or an image (PNG, JPEG or WebP).` };
}
