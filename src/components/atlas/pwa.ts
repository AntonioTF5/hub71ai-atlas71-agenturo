"use client";

// Install affordance for the PWA: Chrome/Edge/Android fire beforeinstallprompt, which we keep for a
// quiet "Install app" menu item. iOS Safari has no prompt, so it gets a one-line hint instead.
import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// Registered at module load so a prompt that fires before React hydrates isn't missed.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const mq = window.matchMedia?.("(display-mode: standalone)");
  mq?.addEventListener?.("change", listener);
  return () => {
    listeners.delete(listener);
    mq?.removeEventListener?.("change", listener);
  };
}

function isStandalone(): boolean {
  return (
    !!window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

const SERVER_FALSE = () => false;

export function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null, SERVER_FALSE);
  const standalone = useSyncExternalStore(subscribe, isStandalone, SERVER_FALSE);
  const ios = useSyncExternalStore(subscribe, isIos, SERVER_FALSE);
  return {
    canInstall: canPrompt && !standalone,
    iosHint: ios && !standalone && !canPrompt,
    install: async () => {
      const e = deferred;
      if (!e) return;
      deferred = null;
      emit();
      try {
        await e.prompt();
        await e.userChoice;
      } catch {
        // dismissed or unsupported
      }
    },
  };
}
