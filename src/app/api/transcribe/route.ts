import type OpenAI from "openai";
import { llm, NO_REASONING } from "@/lib/llm";
import { allow, clientIp } from "@/lib/ratelimit";

// Voice input: the browser records with MediaRecorder and posts the clip here; Gemini (through
// OpenRouter) returns the transcript. Same mechanics as agenturo's /api/transcribe.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MODEL = process.env.OPENROUTER_TRANSCRIBE_MODEL ?? "google/gemini-2.5-flash";
const PROMPT =
  "Transcribe this audio recording verbatim. Output only the exact words spoken, with natural punctuation and capitalization. No commentary, no labels, no surrounding quotation marks. If there is no discernible speech, output nothing.";

/** The container hint OpenRouter's input_audio block expects. */
function formatFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("wav")) return "wav";
  return "webm";
}

export async function POST(req: Request) {
  if (!process.env.OPENROUTER_API_KEY?.trim()) return Response.json({ error: "setup_required" }, { status: 503 });
  if (!allow(`transcribe:${clientIp(req)}`, 120)) {
    return Response.json({ error: "Too many voice messages. Try again in a bit." }, { status: 429 });
  }

  let audio: FormDataEntryValue | null;
  try {
    audio = (await req.formData()).get("audio");
  } catch {
    return Response.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  if (!(audio instanceof File) || !audio.size) return Response.json({ error: "No audio provided." }, { status: 400 });
  if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "Recording too long." }, { status: 413 });

  const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const content = [
    { type: "text", text: PROMPT },
    { type: "input_audio", input_audio: { data, format: formatFromMime(audio.type || "audio/webm") } },
  ] as OpenAI.Chat.ChatCompletionContentPart[];

  // Gemini fails audio two ways: a transient provider error (worth one retry) and a deterministic 400
  // on an empty or malformed clip (not worth retrying).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await llm().chat.completions.create(
        { model: MODEL, temperature: 0, max_tokens: 2000, messages: [{ role: "user", content }], ...NO_REASONING },
        { timeout: 25_000, maxRetries: 0 },
      );
      return Response.json({ text: (res.choices[0]?.message?.content ?? "").trim() });
    } catch (err) {
      const status = (err as { status?: number }).status;
      console.error("Transcription failed:", status ?? "", err instanceof Error ? err.message : "unknown error");
      if (status === 400) break;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return Response.json({ error: "Failed to transcribe audio." }, { status: 502 });
}
