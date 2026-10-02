"use client";

// The conversation's scroll container (the anchoring idea is agenturo's useScrollToBottom).
// On send, the founder's message moves near the top and space is reserved beneath it. As the reply
// grows, the view follows its end, but never past the reply's own first line: a short answer and its
// choices stay fully in view, and a long card is read from its top rather than chased to its bottom.
// Touching the scroll hands control to the reader until the next send. A "Jump to latest" pill shows
// when newer content sits below the fold, and the newest content stays in view when the keyboard opens.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconArrowDown } from "./icons";

const GAP = 16;
const HIDDEN_PX = 48;

function reducedMotion(): boolean {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function ChatScroller({ anchorId, children }: { anchorId: string | null; children: ReactNode }) {
  const hasChat = anchorId !== null;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const anchorTopRef = useRef<number | null>(null);
  const anchorIdRef = useRef<string | null>(anchorId);
  const followRef = useRef(false);
  const atEndRef = useRef(true);
  const mountedRef = useRef(false);
  const [showJump, setShowJump] = useState(false);

  /** Where the conversation itself ends, inside the scroller (the spacer starts there). */
  const contentEnd = () => spacerRef.current?.offsetTop ?? 0;

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const hidden = contentEnd() - (el.scrollTop + el.clientHeight);
    atEndRef.current = hidden <= HIDDEN_PX;
    setShowJump(hidden > HIDDEN_PX);
  }, []);

  /** Reserve just enough space under the conversation for the anchored message to reach the top. */
  const fitSpacer = useCallback(() => {
    const el = scrollerRef.current;
    const spacer = spacerRef.current;
    if (!el || !spacer) return;
    const top = anchorTopRef.current;
    const want = top === null ? 0 : Math.max(0, Math.round(top + el.clientHeight - spacer.offsetTop));
    if (spacer.style.height !== `${want}px`) spacer.style.height = `${want}px`;
  }, []);

  /** Follow the reply's end, capped at the reply's first line. */
  const follow = useCallback(() => {
    const el = scrollerRef.current;
    const id = anchorIdRef.current;
    if (!el || !id || !followRef.current) return;
    const user = contentRef.current?.querySelector<HTMLElement>(`[data-mid="${CSS.escape(id)}"]`);
    const reply = user?.nextElementSibling as HTMLElement | null;
    if (!user || !reply) return;
    const toEnd = contentEnd() - el.clientHeight + 12;
    const target = Math.max(0, Math.min(toEnd, reply.offsetTop - GAP));
    if (target > el.scrollTop + 2) el.scrollTo({ top: target, behavior: reducedMotion() ? "auto" : "smooth" });
  }, []);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    anchorIdRef.current = anchorId;
    if (!anchorId) {
      // Empty chat (fresh case): back to the top.
      followRef.current = false;
      anchorTopRef.current = null;
      fitSpacer();
      el.scrollTop = 0;
    } else if (!mountedRef.current) {
      // A restored conversation opens at its end.
      followRef.current = false;
      anchorTopRef.current = null;
      fitSpacer();
      el.scrollTop = el.scrollHeight;
    } else {
      const node = contentRef.current?.querySelector<HTMLElement>(`[data-mid="${CSS.escape(anchorId)}"]`);
      if (node) {
        followRef.current = true;
        anchorTopRef.current = Math.max(0, node.offsetTop - GAP);
        fitSpacer();
        el.scrollTo({ top: anchorTopRef.current, behavior: reducedMotion() ? "auto" : "smooth" });
      }
    }
    mountedRef.current = true;
    // The scroll and resize events that follow update the jump pill.
  }, [anchorId, fitSpacer]);

  useEffect(() => {
    const el = scrollerRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === "undefined") return;
    let lastHeight = el.clientHeight;
    const ro = new ResizeObserver(() => {
      const wasAtEnd = atEndRef.current;
      fitSpacer();
      if (el.clientHeight < lastHeight && wasAtEnd) {
        // The viewport shrank (keyboard up, rotation): keep the newest content in view.
        const target = contentEnd() - el.clientHeight + 8;
        if (target > el.scrollTop) el.scrollTop = target;
      } else {
        follow();
      }
      lastHeight = el.clientHeight;
      measure();
    });
    ro.observe(el);
    ro.observe(content);

    // Any deliberate scroll gesture hands control to the reader until the next send.
    const release = () => {
      followRef.current = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) release();
    };
    el.addEventListener("wheel", release, { passive: true });
    el.addEventListener("touchmove", release, { passive: true });
    el.addEventListener("keydown", onKey);
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", release);
      el.removeEventListener("touchmove", release);
      el.removeEventListener("keydown", onKey);
    };
  }, [fitSpacer, follow, measure]);

  const jump = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: Math.max(0, contentEnd() - el.clientHeight + 24), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollerRef} onScroll={measure} className="atlas-scroll absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={contentRef}>{children}</div>
        <div ref={spacerRef} aria-hidden="true" />
      </div>
      {showJump && hasChat ? (
        <button
          type="button"
          onClick={jump}
          aria-label="Jump to latest"
          className="atlas-fade absolute bottom-3 left-1/2 z-10 inline-flex size-11 -translate-x-1/2 items-center justify-center gap-1.5 rounded-full border border-line bg-surface/95 text-[14px] font-medium text-ink shadow-lift backdrop-blur transition-colors hover:border-accent hover:text-accent-ink sm:h-10 sm:w-auto sm:px-4"
        >
          <IconArrowDown size={17} />
          <span className="hidden sm:inline">Jump to latest</span>
        </button>
      ) : null}
    </div>
  );
}
