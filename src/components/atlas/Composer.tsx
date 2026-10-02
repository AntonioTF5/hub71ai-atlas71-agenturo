"use client";

// The composer: an auto-growing textarea with voice dictation, file attachments (pick, paste, drop),
// and ↑/↓ recall of earlier messages. Mechanics ported from agenturo's ChatInput; look is Atlas71's.
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore, type Ref } from "react";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENTS, MAX_TOTAL_ATTACHMENT_BYTES, type Attachment } from "@/lib/atlas/attachments";
import { formatBytes, prepareFile, type PendingFile } from "./files";
import { IconArrowUp, IconFile, IconMic, IconPaperclip, IconX, Spinner } from "./icons";
import { canRecordVoice, useVoiceInput } from "./useVoiceInput";
import { cx } from "./ui";

export interface ComposerHandle {
  addFiles: (files: File[]) => void;
  focus: () => void;
}

const NO_SUBSCRIPTION = () => () => {};
const SERVER_FALSE = () => false;
/** Stands in for "has an on-screen keyboard": Enter makes a newline there, and Send is a tap. */
const hasSoftKeyboard = () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
const MAX_HEIGHT = 240;
const BARS = [0, 120, 240, 360, 240, 120, 0];

export function Composer({
  ref,
  busy,
  placeholder,
  history,
  onSend,
}: {
  ref?: Ref<ComposerHandle>;
  busy: boolean;
  placeholder: string;
  /** What the founder already said in this chat, newest first, for ↑ recall. */
  history: string[];
  onSend: (text: string, files: Attachment[], previews: (string | null)[]) => boolean;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [processing, setProcessing] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef("");
  const filesRef = useRef<PendingFile[]>([]);
  const baseTextRef = useRef("");
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkRef = useRef({ index: -1, draft: "" });

  const softKeyboard = useSyncExternalStore(NO_SUBSCRIPTION, hasSoftKeyboard, SERVER_FALSE);
  const voiceSupported = useSyncExternalStore(NO_SUBSCRIPTION, canRecordVoice, SERVER_FALSE);

  const updateText = useCallback((value: string) => {
    textRef.current = value;
    setText(value);
  }, []);

  const setPending = useCallback((next: PendingFile[]) => {
    filesRef.current = next;
    setFiles(next);
  }, []);

  const showError = useCallback((message: string | null) => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setError(message);
    if (message) errorTimer.current = setTimeout(() => setError(null), 6_000);
  }, []);

  const addFiles = useCallback(
    async (list: File[]) => {
      if (!list.length) return;
      showError(null);
      for (const file of list) {
        if (filesRef.current.length >= MAX_ATTACHMENTS) {
          showError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
          break;
        }
        setProcessing((c) => c + 1);
        let result: Awaited<ReturnType<typeof prepareFile>>;
        try {
          result = await prepareFile(file);
        } catch {
          result = { ok: false, error: `Couldn't read ${file.name || "that file"}. Try again.` };
        } finally {
          setProcessing((c) => c - 1);
        }
        if (!result.ok) {
          showError(result.error);
          continue;
        }
        const total = filesRef.current.reduce((sum, f) => sum + f.size, 0) + result.file.size;
        if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
          showError(`Together these files are over ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)}. Remove one and try again.`);
          continue;
        }
        if (filesRef.current.length >= MAX_ATTACHMENTS) {
          showError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
          break;
        }
        setPending([...filesRef.current, result.file]);
      }
    },
    [setPending, showError],
  );

  useImperativeHandle(
    ref,
    () => ({
      addFiles: (list) => void addFiles(list),
      focus: () => taRef.current?.focus(),
    }),
    [addFiles],
  );

  const voice = useVoiceInput({
    onFinalTranscript: (t) => {
      const base = baseTextRef.current;
      const full = base + (base ? " " : "") + t;
      updateText(full);
      baseTextRef.current = full; // a follow-up dictation appends
    },
    onError: (message) => showError(message),
  });

  // Grow with the text up to MAX_HEIGHT, then scroll inside. Empty means one row: a wrapped
  // placeholder must never stretch it. Width changes (rotation, sheet, resize) re-measure.
  const autosize = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    if (!el.value) {
      el.style.height = "";
      el.style.overflowY = "hidden";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    autosize();
  }, [text, autosize]);

  useEffect(() => {
    const el = taRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        autosize();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [autosize]);

  const hasContent = text.trim() !== "" || files.length > 0;
  const mode: "send" | "mic" | "listening" | "transcribing" =
    voice.state === "transcribing"
      ? "transcribing"
      : voice.state === "listening"
        ? "listening"
        : hasContent || !voiceSupported
          ? "send"
          : "mic";

  const send = () => {
    if (voice.state !== "idle") voice.cancel();
    const t = textRef.current.trim();
    const ready = filesRef.current;
    if (busy || processing > 0 || (!t && !ready.length)) return;
    const ok = onSend(
      t,
      ready.map(({ name, mime, size, dataUrl }) => ({ name, mime, size, dataUrl })),
      ready.map((f) => f.preview),
    );
    if (!ok) return;
    updateText("");
    baseTextRef.current = "";
    setPending([]);
    walkRef.current = { index: -1, draft: "" };
    showError(null);
    // On a phone the keyboard covers half the reply: drop it, like every phone chat app does.
    if (hasSoftKeyboard()) taRef.current?.blur();
  };

  const caretToEnd = () => {
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      if (hasSoftKeyboard()) return; // newline; Send is the button
      e.preventDefault();
      send();
      return;
    }
    const walk = walkRef.current;
    if (e.key === "Escape" && walk.index >= 0) {
      e.preventDefault();
      const draft = walk.draft;
      walkRef.current = { index: -1, draft: "" };
      updateText(draft);
      caretToEnd();
      return;
    }
    if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const el = e.currentTarget;
    if (e.key === "ArrowUp" && el.selectionStart === 0 && el.selectionEnd === 0) {
      if (walk.index === -1) walk.draft = textRef.current;
      const next = walk.index + 1;
      if (next >= history.length) return;
      e.preventDefault();
      walk.index = next;
      updateText(history[next]);
      caretToEnd();
    } else if (e.key === "ArrowDown" && walk.index >= 0 && el.selectionStart === el.value.length) {
      e.preventDefault();
      walk.index -= 1;
      updateText(walk.index === -1 ? walk.draft : history[walk.index]);
      caretToEnd();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = Array.from(e.clipboardData?.files ?? []);
    if (pasted.length) {
      e.preventDefault();
      void addFiles(pasted);
    }
  };

  const onAction = () => {
    if (mode === "transcribing") return;
    if (mode === "mic") {
      baseTextRef.current = textRef.current.trim();
      void voice.start();
      return;
    }
    if (mode === "listening") {
      voice.stop();
      return;
    }
    send();
  };

  const actionDisabled = mode === "transcribing" ? true : mode === "send" ? busy || processing > 0 || !hasContent : false;
  const actionLabel =
    mode === "mic" ? "Dictate a message" : mode === "listening" ? "Stop recording" : mode === "transcribing" ? "Transcribing" : "Send message";
  const readOnly = voice.state !== "idle";

  return (
    <div className="mx-auto w-full max-w-[760px]">
      {error ? (
        <div role="alert" className="atlas-fade mb-2 flex items-center gap-2 rounded-full border border-bad/15 bg-bad-soft py-1 pl-3.5 pr-1 text-[13px] text-bad">
          <span className="min-w-0 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => showError(null)}
            aria-label="Dismiss"
            className="-my-1 grid size-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-bad/10"
          >
            <IconX size={14} />
          </button>
        </div>
      ) : null}

      <div
        className={cx(
          "rounded-[22px] border bg-surface shadow-lift transition-[border-color,box-shadow] duration-150",
          "border-line-strong focus-within:border-accent focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent),var(--elev-lift)]",
        )}
      >
        {files.length || processing ? (
          <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attachments">
            {files.map((f) => (
              <li key={f.id} className="atlas-fade relative">
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local data URL thumbnail
                  <img src={f.preview} alt={f.name} width={56} height={56} className="size-14 rounded-xl border border-line object-cover" />
                ) : (
                  <div className="flex h-14 max-w-[220px] items-center gap-2 rounded-xl border border-line bg-sunken pl-3 pr-9">
                    <IconFile size={18} className="shrink-0 text-muted" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{f.name}</p>
                      <p className="text-[12px] tabular-nums text-muted">{formatBytes(f.size)}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setPending(filesRef.current.filter((x) => x.id !== f.id))}
                  aria-label={`Remove ${f.name}`}
                  className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full border border-line bg-surface text-muted shadow-sm transition-colors after:absolute after:-inset-2.5 after:content-[''] hover:text-ink"
                >
                  <IconX size={12} strokeWidth={2.4} />
                </button>
              </li>
            ))}
            {processing ? (
              <li className="flex h-14 items-center gap-2 rounded-xl border border-dashed border-line-strong px-3 text-[13px] text-muted">
                <Spinner size={14} className="text-accent" />
                Preparing…
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="flex items-end gap-1 p-1.5">
          <button
            type="button"
            onClick={() => pickerRef.current?.click()}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Attach a PDF or image"
            title="Attach a PDF or image"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <IconPaperclip size={20} />
          </button>
          <input
            ref={pickerRef}
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="hidden"
            tabIndex={-1}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              void addFiles(picked);
            }}
          />

          <div className="relative min-w-0 flex-1">
            <label htmlFor="atlas-composer" className="sr-only">
              Message Atlas71
            </label>
            <textarea
              id="atlas-composer"
              ref={taRef}
              rows={1}
              value={text}
              readOnly={readOnly}
              onChange={(e) => {
                updateText(e.target.value);
                if (walkRef.current.index >= 0) walkRef.current = { index: -1, draft: "" };
              }}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={voice.state === "transcribing" ? "Transcribing…" : placeholder}
              enterKeyHint={softKeyboard ? "enter" : "send"}
              autoComplete="off"
              spellCheck
              className="block max-h-60 w-full resize-none bg-transparent px-1.5 py-2.5 text-[16px] leading-6 text-ink placeholder:truncate placeholder:text-muted focus:outline-none focus-visible:outline-none"
            />
            {voice.state === "listening" ? (
              <div className="atlas-fade pointer-events-none absolute inset-0 flex items-center gap-3 rounded-xl bg-surface px-1.5" aria-hidden="true">
                <span className="flex h-[18px] items-center gap-[3px]">
                  {BARS.map((delay, i) => (
                    <span key={i} className="atlas-voice-bar" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </span>
                <span className="text-[16px] text-muted">Listening…</span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onAction}
            onMouseDown={(e) => e.preventDefault()}
            disabled={actionDisabled}
            aria-label={actionLabel}
            title={actionLabel}
            className={cx(
              "grid size-11 shrink-0 place-items-center rounded-full transition-colors",
              mode === "listening"
                ? "bg-bad text-white hover:bg-bad/90"
                : mode === "mic"
                  ? "bg-sunken text-ink hover:bg-accent-soft hover:text-accent-ink"
                  : "bg-accent text-white hover:bg-accent-ink disabled:bg-line disabled:text-muted",
            )}
          >
            {mode === "transcribing" || (mode === "send" && busy && hasContent) ? (
              <Spinner size={18} />
            ) : mode === "listening" ? (
              <span className="flex h-4 items-center gap-[3px]" aria-hidden="true">
                {[0, 180, 360, 180].map((delay, i) => (
                  <span key={i} className="atlas-voice-bar atlas-voice-bar-sm" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </span>
            ) : mode === "mic" ? (
              <IconMic size={20} />
            ) : (
              <IconArrowUp size={20} strokeWidth={2.4} />
            )}
          </button>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {voice.state === "listening" ? "Listening" : voice.state === "transcribing" ? "Transcribing" : ""}
      </p>
    </div>
  );
}
