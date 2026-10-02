"use client";

// The composer: an auto-growing textarea with voice dictation, file attachments (pick, paste, drop),
// and ↑/↓ recall of earlier messages. Mechanics ported from agenturo's ChatInput; look is Atlas71's.
// Each attached file gets ready on its own (compress, upload or read inline) with its progress in a
// pill; removing a pill cancels its upload, and Send waits until every file is ready.
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useSyncExternalStore, type Ref } from "react";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENTS, type Attachment } from "@/lib/atlas/attachments";
import { FileBadge } from "./file-badge";
import { FileError, checkFile, formatBytes, makeInlineRoom, newFileId, prepareFile, type PendingFile } from "./files";
import { IconArrowUp, IconCheck, IconMic, IconPaperclip, IconX, Spinner } from "./icons";
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

function FilePill({ file, onRemove }: { file: PendingFile; onRemove: () => void }) {
  const uploading = file.stage === "uploading";
  const ready = file.stage === "ready";
  const percent = Math.round(file.progress);
  const status = uploading
    ? `Uploading ${percent}% · ${formatBytes(file.bytes)}`
    : ready
      ? `${file.note ?? "Ready"}${file.note === "Uploaded" || file.note === "Ready" ? ` · ${formatBytes(file.bytes)}` : ""}`
      : (file.activity ?? "Preparing…");
  return (
    <li className="atlas-fade relative w-[272px] shrink-0 sm:w-[320px]" title={file.hint}>
      <div className="relative flex h-14 items-center gap-2.5 overflow-hidden rounded-xl border border-line bg-sunken py-2 pl-2 pr-10">
        {file.preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local data URL thumbnail
          <img src={file.preview} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg border border-line object-cover" />
        ) : (
          <FileBadge mime={file.mime} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5 text-ink">{file.name}</p>
          <p className="flex items-center gap-1 text-[12px] leading-4 tabular-nums text-muted">
            {ready ? (
              <IconCheck size={12} strokeWidth={3} className="shrink-0 text-good" />
            ) : uploading ? null : (
              <Spinner size={12} className="shrink-0 text-accent" />
            )}
            <span className="truncate">{status}</span>
          </p>
        </div>
        {uploading ? (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-accent-soft" aria-hidden="true">
            <span className="block h-full bg-accent transition-[width] duration-200 ease-out" style={{ width: `${Math.max(2, percent)}%` }} />
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={uploading ? `Cancel the upload of ${file.name}` : `Remove ${file.name}`}
        title={uploading ? "Cancel upload" : "Remove"}
        className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-line hover:text-ink"
      >
        <IconX size={14} strokeWidth={2.2} />
      </button>
    </li>
  );
}

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
  const [error, setError] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef("");
  const filesRef = useRef<PendingFile[]>([]);
  /** One per file still getting ready: aborting it cancels the upload or the reading. */
  const jobsRef = useRef(new Map<string, AbortController>());
  /** Inline work (fitting photos and scans into the budget) runs one file at a time. */
  const inlineQueueRef = useRef<Promise<unknown>>(Promise.resolve());
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

  const patchFile = useCallback(
    (id: string, patch: Partial<PendingFile>) => {
      if (!filesRef.current.some((f) => f.id === id)) return; // removed meanwhile
      setPending(filesRef.current.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    [setPending],
  );

  const removeFile = useCallback(
    (id: string) => {
      jobsRef.current.get(id)?.abort();
      jobsRef.current.delete(id);
      setPending(filesRef.current.filter((f) => f.id !== id));
    },
    [setPending],
  );

  /** Queues inline work behind the files before it, with the room this file may take in the request. */
  const inlineFor = useCallback(
    (id: string) =>
      <T,>(work: (room: (need: number) => number) => Promise<T>): Promise<T> => {
        const run = inlineQueueRef.current.then(() =>
          work((need) => {
            const { free, files: next } = makeInlineRoom(filesRef.current, id, need);
            if (next !== filesRef.current) setPending(next);
            return free;
          }),
        );
        inlineQueueRef.current = run.catch(() => undefined);
        return run;
      },
    [setPending],
  );

  const addFiles = useCallback(
    (list: File[]) => {
      if (!list.length) return;
      showError(null);
      for (const file of list) {
        if (filesRef.current.length >= MAX_ATTACHMENTS) {
          showError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
          break;
        }
        const checked = checkFile(file);
        if (!checked.ok) {
          showError(checked.error);
          continue;
        }
        const id = newFileId();
        const job = new AbortController();
        jobsRef.current.set(id, job);
        setPending([
          ...filesRef.current,
          {
            id,
            kind: checked.kind,
            name: checked.name,
            mime: checked.kind === "pdf" ? "application/pdf" : file.type || "image/*",
            size: file.size,
            stage: "preparing",
            activity: checked.kind === "pdf" ? "Preparing…" : "Compressing…",
            progress: 0,
            bytes: file.size,
            preview: null,
          },
        ]);
        prepareFile(file, checked.kind, checked.name, {
          signal: job.signal,
          update: (patch) => patchFile(id, patch),
          inline: inlineFor(id),
        })
          .catch((err: unknown) => {
            if (job.signal.aborted) return; // the founder removed it
            if (!(err instanceof FileError)) console.warn("[atlas71] couldn't prepare a file", err);
            removeFile(id);
            showError(err instanceof FileError ? err.message : `Couldn't read ${checked.name}. Try again.`);
          })
          .finally(() => {
            if (jobsRef.current.get(id) === job) jobsRef.current.delete(id);
          });
      }
    },
    [inlineFor, patchFile, removeFile, setPending, showError],
  );

  // Leaving the page (or a reset that remounts) cancels whatever is still uploading.
  useEffect(() => {
    const jobs = jobsRef.current;
    return () => {
      for (const job of jobs.values()) job.abort();
      jobs.clear();
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      addFiles,
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
  const filesPending = files.some((f) => f.stage !== "ready");
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
    const attachments = ready.flatMap((f) => (f.stage === "ready" && f.attachment ? [f.attachment] : []));
    if (busy || attachments.length !== ready.length || (!t && !ready.length)) return;
    const ok = onSend(
      t,
      attachments,
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

  const actionDisabled = mode === "transcribing" ? true : mode === "send" ? busy || filesPending || !hasContent : false;
  const actionLabel =
    mode === "mic"
      ? "Dictate a message"
      : mode === "listening"
        ? "Stop recording"
        : mode === "transcribing"
          ? "Transcribing"
          : filesPending
            ? "Send (waiting for your files)"
            : "Send message";
  const readOnly = voice.state !== "idle";
  const readyCount = files.filter((f) => f.stage === "ready").length;

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
        {files.length ? (
          // A phone swipes through the pills; wider screens wrap them, two to a row.
          <ul className="atlas-no-scrollbar flex gap-2 overflow-x-auto px-3 pt-3 sm:flex-wrap sm:overflow-visible" aria-label="Attachments">
            {files.map((f) => (
              <FilePill key={f.id} file={f} onRemove={() => removeFile(f.id)} />
            ))}
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
      <p className="sr-only" aria-live="polite">
        {files.length ? (readyCount === files.length ? `${files.length === 1 ? "Your file is" : "All files are"} ready to send.` : `${readyCount} of ${files.length} files ready.`) : ""}
      </p>
    </div>
  );
}
