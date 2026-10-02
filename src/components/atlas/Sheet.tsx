"use client";

// A modal sheet on the native <dialog>: focus trap, Escape and inert background come from the
// platform. Bottom sheet with a drag handle on phones, a right-hand drawer from 768px.
import { useEffect, useRef, type ReactNode } from "react";
import { wrapTab } from "./focus";
import { IconX } from "./icons";

const LOCK = "atlas-locked";

function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function Sheet({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; dy: number; t: number } | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.removeAttribute("data-closing");
      d.style.transform = "";
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
      document.documentElement.classList.add(LOCK);
      return;
    }
    if (!open && d.open) {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        d.removeAttribute("data-closing");
        d.style.transform = "";
        d.style.removeProperty("--drag");
        if (d.open) d.close();
        document.documentElement.classList.remove(LOCK);
      };
      if (reducedMotion()) {
        finish();
        return;
      }
      d.setAttribute("data-closing", "");
      const onEnd = (e: AnimationEvent) => {
        if (e.target === d) finish();
      };
      d.addEventListener("animationend", onEnd);
      const timer = setTimeout(finish, 260);
      return () => {
        d.removeEventListener("animationend", onEnd);
        clearTimeout(timer);
      };
    }
  }, [open]);

  // Leaving the phone layout (rotation, resize) closes the sheet: the tracker is on screen there.
  useEffect(() => {
    const mq = window.matchMedia?.("(min-width: 1100px)");
    if (!mq) return;
    const onChange = () => {
      if (mq.matches) onCloseRef.current();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => document.documentElement.classList.remove(LOCK), []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768 || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, dy: 0, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = drag.current;
    const d = ref.current;
    if (!s || !d) return;
    s.dy = Math.max(0, e.clientY - s.y);
    d.style.transform = `translateY(${s.dy}px)`;
    d.style.setProperty("--drag", `${s.dy}px`);
  };
  const onPointerUp = () => {
    const s = drag.current;
    const d = ref.current;
    drag.current = null;
    if (!s || !d) return;
    const velocity = s.dy / Math.max(1, performance.now() - s.t);
    if (s.dy > 110 || (s.dy > 24 && velocity > 0.6)) {
      onClose();
      return;
    }
    d.style.transition = "transform 200ms cubic-bezier(0.2, 0.9, 0.25, 1)";
    d.style.transform = "";
    setTimeout(() => {
      d.style.transition = "";
    }, 220);
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className="atlas-sheet"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={wrapTab}
      onClose={() => {
        document.documentElement.classList.remove(LOCK);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex h-11 shrink-0 touch-none items-center justify-end px-2 md:h-16 md:px-4"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span aria-hidden="true" className="absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-line-strong md:hidden" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <IconX size={20} />
        </button>
      </div>
      <div className="atlas-scroll min-h-0 flex-1 overflow-y-auto" style={{ paddingBottom: "var(--sab)" }}>
        {children}
      </div>
    </dialog>
  );
}
