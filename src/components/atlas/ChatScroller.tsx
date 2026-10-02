"use client";

// The conversation's scroll container. When the founder sends, their message is anchored near the
// top and the reply grows into reserved space beneath it (the ChatGPT/agenturo pattern), so a long
// card is read from its top rather than chased to its bottom. A "Jump to latest" pill appears when
// newer content sits below the fold, and the latest content stays in view when the keyboard opens.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconArrowDown } from "./icons";

const GAP = 16;
const HIDDEN_PX = 48;

export function ChatScroller({ anchorId, children }: { anchorId: string | null; children: ReactNode }) {
  const hasChat = anchorId !== null;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const anchorTopRef = useRef<number | null>(null);
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
    setShowJump(hidden > HIDDEN_PX && el.scrollHeight > el.clientHeight + HIDDEN_PX);
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

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!anchorId) {
      // Empty chat (fresh case): back to the top.
      anchorTopRef.current = null;
      fitSpacer();
      el.scrollTop = 0;
    } else if (!mountedRef.current) {
      // A restored conversation opens at its end.
      anchorTopRef.current = null;
      fitSpacer();
      el.scrollTop = el.scrollHeight;
    } else {
      const node = contentRef.current?.querySelector<HTMLElement>(`[data-mid="${CSS.escape(anchorId)}"]`);
      if (node) {
        anchorTopRef.current = Math.max(0, node.offsetTop - GAP);
        fitSpacer();
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({ top: anchorTopRef.current, behavior: reduce ? "auto" : "smooth" });
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
      // The viewport shrank (keyboard up, drawer, rotation): keep the newest content in view.
      if (el.clientHeight < lastHeight && wasAtEnd) {
        const target = contentEnd() - el.clientHeight + 8;
        if (target > el.scrollTop) el.scrollTop = target;
      }
      lastHeight = el.clientHeight;
      measure();
    });
    ro.observe(el);
    ro.observe(content);
    return () => ro.disconnect();
  }, [fitSpacer, measure]);

  const jump = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: Math.max(0, contentEnd() - el.clientHeight + 24), behavior: reduce ? "auto" : "smooth" });
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
          className="atlas-fade absolute bottom-3 left-1/2 z-10 inline-flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-4 text-[14px] font-medium text-ink shadow-lift backdrop-blur transition-colors hover:border-accent hover:text-accent-ink"
        >
          <IconArrowDown size={16} />
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
