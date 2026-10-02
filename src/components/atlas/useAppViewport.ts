"use client";

// Sizes the app shell to the visual viewport, so the iOS keyboard never covers the composer, and
// undoes the page scroll iOS forces when an input takes focus (agenturo's useVisualViewportBox,
// written to CSS variables instead of React state so typing never re-renders the app).
import { useEffect } from "react";

export function useAppViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    let raf = 0;

    const measure = () => {
      raf = 0;
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
      if (!vv || vv.scale > 1.01) return; // pinch zoom: leave the layout alone
      root.style.setProperty("--app-h", `${Math.round(vv.height)}px`);
      root.style.setProperty("--app-top", `${Math.round(vv.offsetTop)}px`);
      if (window.innerHeight - vv.height > 80) root.dataset.kb = "open";
      else delete root.dataset.kb;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const undoForcedScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };

    measure();
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", undoForcedScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", undoForcedScroll);
      root.style.removeProperty("--app-h");
      root.style.removeProperty("--app-top");
      delete root.dataset.kb;
    };
  }, []);
}
