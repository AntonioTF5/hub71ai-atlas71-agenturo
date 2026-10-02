"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AgentAction } from "@/lib/atlas/types";
import type { Attachment } from "@/lib/atlas/attachments";
import { PERSONAS, type Persona, type PersonaId } from "@/lib/atlas/personas";
import { aed } from "@/lib/atlas/format";
import { ChatScroller } from "./ChatScroller";
import { Composer, type ComposerHandle } from "./Composer";
import { AtlasUiProvider, type AtlasUi } from "./context";
import { Header } from "./Header";
import { personaName, setIdentity, useIdentity } from "./identity";
import { IconChevronUp, IconPaperclip, IconPanel, IconX } from "./icons";
import { derive, exportCase, isPartialPrice } from "./live";
import { MessageView } from "./Message";
import type { UiMessage } from "./session";
import { Sheet } from "./Sheet";
import { SignInDialog } from "./SignInDialog";
import { STORAGE_KEY } from "./storage";
import { getAtlasStore, useAtlasSession } from "./store";
import { TimeControls, TrackerPanel } from "./Tracker";
import { useAppViewport } from "./useAppViewport";
import { Welcome } from "./Welcome";
import { cx } from "./ui";

const WIDE_QUERY = "(min-width: 640px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia?.(WIDE_QUERY);
  mq?.addEventListener("change", cb);
  return () => mq?.removeEventListener("change", cb);
}
const isWide = () => !!window.matchMedia?.(WIDE_QUERY).matches;

function textOf(m: UiMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();
}

/** Last line of defence: if rendering ever fails, offer a clean restart instead of a white screen. */
class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[atlas71] the app failed to render", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="atlas-app grid place-items-center bg-paper px-6 text-center">
        <div className="max-w-sm">
          <p className="text-[20px] font-semibold text-ink">Something on this screen broke.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">Start a fresh case and Atlas71 will be right back.</p>
          <button
            type="button"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-[15px] font-semibold text-white hover:bg-accent-ink"
            onClick={() => {
              try {
                window.localStorage.removeItem(STORAGE_KEY);
              } catch {
                // storage blocked
              }
              window.location.reload();
            }}
          >
            Reset demo
          </button>
        </div>
      </div>
    );
  }
}

function UndoToast({ onUndo, onDismiss }: { onUndo: () => void; onDismiss: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: "calc(var(--sab) + 7.5rem)" }}>
      <div role="status" className="atlas-rise pointer-events-auto flex items-center gap-1 rounded-full bg-ink py-1 pl-4 pr-1 text-[14px] text-white shadow-float">
        <span className="pr-2">Started a fresh case.</span>
        <button type="button" onClick={onUndo} className="min-h-11 rounded-full px-3 font-semibold text-accent-soft hover:bg-white/10">
          Undo
        </button>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="grid size-11 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
          <IconX size={16} />
        </button>
      </div>
    </div>
  );
}

function AtlasShell() {
  const store = getAtlasStore();
  const snap = useAtlasSession();
  useAppViewport();

  useEffect(() => {
    store.init();
  }, [store]);

  const { state, messages, busy } = snap;
  const wide = useSyncExternalStore(subscribeWide, isWide, () => false);
  const derived = useMemo(() => derive(state), [state]);
  const partial = derived.price ? isPartialPrice(derived.price) : false;

  const send = useCallback((text: string, action?: AgentAction) => store.send(text, { action }), [store]);
  const ui = useMemo<AtlasUi>(
    () => ({
      state,
      busy,
      send,
      livePrice: derived.price,
      payChecklist: derived.checklist,
      isPartial: isPartialPrice,
      exportFile: (ext) => exportCase(state, ext),
    }),
    [state, busy, send, derived.price, derived.checklist],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const stored = useIdentity();
  // Shown exactly as the persona introduces itself, whatever an older save held.
  const user = useMemo(() => {
    if (!stored) return null;
    const persona = PERSONAS.find((p) => p.id === stored.personaId);
    return persona ? { name: personaName(persona), email: persona.email, personaId: persona.id } : stored;
  }, [stored]);
  const [signInFor, setSignInFor] = useState<Persona | null>(null);

  // A persona card asks for the sandbox sign-in first, unless that account is already signed in.
  const pickPersona = useCallback(
    (id: PersonaId) => {
      const persona = PERSONAS.find((p) => p.id === id);
      if (!persona) return;
      if (user?.personaId === id) store.startPersona(id);
      else setSignInFor(persona);
    },
    [store, user],
  );
  const onSignedIn = useCallback(
    (persona: Persona) => {
      setIdentity({ name: personaName(persona), email: persona.email, personaId: persona.id });
      setSignInFor(null);
      store.startPersona(persona.id);
    },
    [store],
  );
  const onSignOut = useCallback(() => {
    setIdentity(null);
    store.reset();
  }, [store]);
  const [dragging, setDragging] = useState(false);
  const composerRef = useRef<ComposerHandle>(null);

  const onPick = useCallback((text: string) => store.send(text), [store]);
  const onRetry = useCallback(() => store.retry(), [store]);
  const onAdvance = useCallback(
    (text: string, action: AgentAction) => {
      if (store.send(text, { action })) setSheetOpen(false);
    },
    [store],
  );
  const onComposerSend = useCallback(
    (text: string, files: Attachment[], previews: (string | null)[]) => store.send(text, { files, previews }),
    [store],
  );

  const lastUserId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "user") return messages[i].id;
    return null;
  }, [messages]);
  const nextUserText = useMemo(
    () => messages.map((m, i) => (m.role === "assistant" && messages[i + 1]?.role === "user" ? textOf(messages[i + 1]) : undefined)),
    [messages],
  );
  const history = useMemo(
    () =>
      messages
        .filter((m) => m.role === "user")
        .map(textOf)
        .filter(Boolean)
        .reverse(),
    [messages],
  );

  const steps = derived.plan?.groups.flatMap((g) => g.steps) ?? [];
  const doneCount = steps.filter((s) => s.status === "done").length;
  const landingStatus = state.paid
    ? `Day ${derived.day} · ${doneCount}/${steps.length} done`
    : derived.price
      ? `${partial ? "from " : ""}${aed(derived.price.totalAed)}`
      : state.profile.company ?? "";

  const tracker = (headingId: string) => (
    <TrackerPanel
      headingId={headingId}
      state={state}
      plan={derived.plan}
      price={derived.price}
      partial={partial}
      waiting={derived.waiting}
      day={derived.day}
      busy={busy}
      onAdvance={onAdvance}
    />
  );

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

  return (
    <AtlasUiProvider value={ui}>
      <div className="atlas-app flex flex-col overflow-hidden bg-paper">
        <Header health={snap.health} onReset={store.reset} user={user} onSignOut={onSignOut} />
        <div className="flex min-h-0 flex-1">
          <main
            className="relative flex min-w-0 flex-1 flex-col"
            onDragEnter={(e) => {
              if (hasFiles(e)) setDragging(true);
            }}
            onDragOver={(e) => {
              if (hasFiles(e)) e.preventDefault();
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={(e) => {
              if (!hasFiles(e)) return;
              e.preventDefault();
              setDragging(false);
              composerRef.current?.addFiles(Array.from(e.dataTransfer.files));
            }}
          >
            {snap.ready ? (
              <ChatScroller anchorId={lastUserId}>
                {messages.length === 0 ? (
                  <Welcome onPick={pickPersona} disabled={busy} />
                ) : (
                  <section aria-label="Conversation" className="mx-auto w-full max-w-[760px] space-y-7 px-4 pb-8 pt-6 sm:px-6">
                    <h1 className="sr-only">Atlas71 conversation</h1>
                    {messages.map((m, i) => (
                      <MessageView
                        key={m.id}
                        message={m}
                        isLast={i === messages.length - 1}
                        busy={busy}
                        nextUserText={nextUserText[i]}
                        previews={snap.previews[m.id]}
                        onPick={onPick}
                        onRetry={onRetry}
                      />
                    ))}
                  </section>
                )}
              </ChatScroller>
            ) : (
              <div className="min-h-0 flex-1" />
            )}

            <div className="atlas-safe-x atlas-safe-bottom shrink-0 pt-2">
              {snap.ready && messages.length ? (
                <div className="relative mx-auto mb-2 w-full max-w-[760px] wide:hidden">
                  <div className="atlas-no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={`Your landing${landingStatus ? `: ${landingStatus}` : ""}${derived.waiting.length ? ", something is waiting on you" : ""}`}
                      onClick={() => setSheetOpen(true)}
                      className={cx(
                        "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-3 text-[14px] shadow-card transition-colors hover:border-accent",
                        // Once the clock controls share the row, a phone gets the icon alone.
                        state.paid && "max-sm:w-11 max-sm:justify-center max-sm:px-0",
                      )}
                    >
                      <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
                        <IconPanel size={16} />
                      </span>
                      <span className={cx("font-semibold text-ink", state.paid && "max-sm:hidden")} aria-hidden="true">
                        Your landing
                      </span>
                      {landingStatus ? (
                        <span className={cx("tabular-nums text-muted", state.paid && "max-sm:hidden")} aria-hidden="true">
                          {landingStatus}
                        </span>
                      ) : null}
                      {derived.waiting.length ? (
                        <span
                          aria-hidden="true"
                          className={cx("size-2 rounded-full bg-gold", state.paid && "max-sm:absolute max-sm:right-0.5 max-sm:top-0.5 max-sm:size-2.5 max-sm:ring-2 max-sm:ring-surface")}
                        />
                      ) : null}
                      <IconChevronUp size={16} className={cx("text-muted", state.paid && "max-sm:hidden")} aria-hidden="true" />
                    </button>
                    {state.paid ? <TimeControls compact busy={busy} onAdvance={onAdvance} className="max-sm:min-w-0 max-sm:flex-1" /> : null}
                  </div>
                </div>
              ) : null}
              <Composer
                ref={composerRef}
                busy={busy || !snap.ready}
                history={history}
                placeholder={
                  messages.length ? "Reply to Atlas71…" : wide ? "Tell Atlas71 what you build and who's moving…" : "Tell Atlas71 what you build…"
                }
                onSend={onComposerSend}
              />
              <p className="mx-auto mt-2 hidden max-w-[760px] text-center text-[12px] text-muted sm:block">
                Sandbox: filings and payments are simulated. AI checks are not official decisions.
              </p>
            </div>

            {dragging ? (
              <div className="atlas-fade pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-[20px] border-2 border-dashed border-accent bg-paper/85 backdrop-blur-sm">
                <p className="flex items-center gap-2 text-[16px] font-medium text-accent-ink">
                  <IconPaperclip size={20} />
                  Drop to attach a PDF or image
                </p>
              </div>
            ) : null}
          </main>

          <aside
            aria-label="Your landing"
            className={cx("atlas-scroll hidden w-[380px] shrink-0 overflow-y-auto border-l border-line bg-surface wide:block")}
          >
            {snap.ready ? tracker("tracker-title") : null}
          </aside>
        </div>

        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} labelledBy="tracker-sheet-title">
          {tracker("tracker-sheet-title")}
        </Sheet>
        {signInFor ? <SignInDialog persona={signInFor} onClose={() => setSignInFor(null)} onSignedIn={onSignedIn} /> : null}
        {snap.canUndo ? <UndoToast onUndo={store.undoReset} onDismiss={store.dismissUndo} /> : null}
      </div>
    </AtlasUiProvider>
  );
}

export default function AtlasApp() {
  return (
    <AppBoundary>
      <AtlasShell />
    </AppBoundary>
  );
}
