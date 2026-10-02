// Files the founder attaches to a message: images (compressed in the browser) and PDFs, sent inline as
// data URLs with that one request. Only metadata stays in the chat history; the model reads the file once.
import type { AgentRequest, ChatMessage } from "./types";

export const MAX_ATTACHMENTS = 3;
/** Per file, after browser-side image compression. With the total cap, a request stays under Vercel's 4.5 MB body limit. */
export const MAX_ATTACHMENT_BYTES = 900_000;
export const MAX_TOTAL_ATTACHMENT_BYTES = 2_400_000;
export const ATTACHMENT_ACCEPT = "image/png,image/jpeg,image/webp,image/heic,application/pdf";
export const ATTACHMENT_MIME = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;

export interface AttachmentMeta {
  name: string;
  mime: string;
  size: number; // bytes of the data sent
}

export interface Attachment extends AttachmentMeta {
  dataUrl: string; // "data:<mime>;base64,..."
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

export function attachmentNote(files: AttachmentMeta[]): string {
  return `(attached: ${files.map((f) => f.name).join(", ")})`;
}
