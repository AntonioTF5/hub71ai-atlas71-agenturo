"use client";

// Voice input, ported from agenturo: MediaRecorder captures the clip, and on stop it goes to
// /api/transcribe, which returns the transcript. No live word-by-word preview: the composer shows a
// CSS waveform while listening instead, so nothing competes with the recorder for the mic.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "transcribing";

interface VoiceInputCallbacks {
  /** The transcript from the server. */
  onFinalTranscript?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (message: string) => void;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // webm/opus on Chrome and Firefox, mp4/AAC on Safari.
  for (const c of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

/** True when this browser can record audio at all. Call from the client only. */
export function canRecordVoice(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

// A real utterance encodes to several KB even when short; a header-only capture is a few hundred bytes.
const MIN_AUDIO_BYTES = 1024;
/** A forgotten mic stops itself; the server takes clips up to 5 MB. */
const MAX_RECORDING_MS = 120_000;

export function useVoiceInput(callbacks: VoiceInputCallbacks) {
  const [state, setState] = useState<VoiceState>("idle");

  // Latest callbacks without re-creating start/stop on every render.
  const cbRef = useRef(callbacks);
  useLayoutEffect(() => {
    cbRef.current = callbacks;
  });

  // Synchronous mirror of `state` so guards never read a stale render closure.
  const stateRef = useRef<VoiceState>("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const limitRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setVoiceState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
    cbRef.current.onStateChange?.(s);
  }, []);

  const stopStream = useCallback(() => {
    if (limitRef.current) {
      clearTimeout(limitRef.current);
      limitRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const transcribe = useCallback(
    async (blob: Blob) => {
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const fd = new FormData();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        fd.append("audio", blob, `voice.${ext}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: fd, signal: ac.signal });
        const json: { text?: unknown; error?: unknown } = await res.json().catch(() => ({}));
        if (!mountedRef.current) return;
        if (typeof json.text === "string" && json.text.trim()) {
          cbRef.current.onFinalTranscript?.(json.text.trim());
        } else if (json.error === "setup_required") {
          cbRef.current.onError?.("Voice input isn't set up on this deployment.");
        } else if (!res.ok || json.error) {
          // A rejected or empty clip isn't the user's fault: a gentle retry hint, not the raw server error.
          cbRef.current.onError?.("Didn't catch that. Try again.");
        } else {
          cbRef.current.onError?.("No speech detected.");
        }
      } catch (e) {
        if (mountedRef.current && (e as Error)?.name !== "AbortError") cbRef.current.onError?.("Transcription failed.");
      } finally {
        abortRef.current = null;
        if (mountedRef.current) setVoiceState("idle");
      }
    },
    [setVoiceState],
  );

  const stop = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    stopStream();
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      setVoiceState("transcribing"); // onstop → transcribe() flips back to idle
      rec.stop();
    } else {
      setVoiceState("idle");
    }
  }, [stopStream, setVoiceState]);

  const start = useCallback(async () => {
    if (startingRef.current || stateRef.current !== "idle") return;
    startingRef.current = true;
    stoppingRef.current = false;
    chunksRef.current = [];

    if (!canRecordVoice()) {
      startingRef.current = false;
      cbRef.current.onError?.("Voice input isn't supported in this browser.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      startingRef.current = false;
      cbRef.current.onError?.("Microphone access denied.");
      return;
    }

    // Unmounted while the permission prompt was open: don't leave the mic hot.
    if (!mountedRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      startingRef.current = false;
      return;
    }
    streamRef.current = stream;

    const mime = pickMimeType();
    try {
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        recorderRef.current = null;
        if (!mountedRef.current) return;
        if (blob.size >= MIN_AUDIO_BYTES) void transcribe(blob);
        else setVoiceState("idle"); // empty capture: drop it silently
      };
      rec.start();
    } catch {
      recorderRef.current = null;
    }

    if (!recorderRef.current) {
      stopStream();
      startingRef.current = false;
      cbRef.current.onError?.("Voice input isn't supported in this browser.");
      return;
    }

    startingRef.current = false;
    limitRef.current = setTimeout(() => stop(), MAX_RECORDING_MS);
    setVoiceState("listening");
  }, [transcribe, stopStream, setVoiceState, stop]);

  const toggle = useCallback(() => {
    if (stateRef.current === "idle") void start();
    else if (stateRef.current === "listening") stop();
    // transcribing: let it finish
  }, [start, stop]);

  /** Hard stop with no transcription: used when the user sends mid-recording. */
  const cancel = useCallback(() => {
    stoppingRef.current = true;
    startingRef.current = false;
    const rec = recorderRef.current;
    if (rec) {
      rec.onstop = null;
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        // already stopped
      }
      recorderRef.current = null;
    }
    chunksRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    stopStream();
    setVoiceState("idle");
  }, [stopStream, setVoiceState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        recorderRef.current?.stop();
      } catch {
        // noop
      }
      abortRef.current?.abort();
      stopStream();
    };
  }, [stopStream]);

  return { state, start, stop, toggle, cancel };
}
