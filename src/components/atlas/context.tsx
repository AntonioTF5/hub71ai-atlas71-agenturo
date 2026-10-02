"use client";

// What a card needs from the live session: the current case, whether a reply is streaming,
// a way to send, and the engine helpers. The app provides the real ones; the dev gallery
// provides fixtures, so every card renders without the server.
import { createContext, useContext } from "react";
import type { AgentAction, CaseState, PriceCardData } from "@/lib/atlas/types";
import type { PayCheck } from "@/lib/atlas/engine";

export interface ExportFile {
  name: string;
  body: string;
  type: string;
}

export interface AtlasUi {
  state: CaseState;
  busy: boolean;
  /** Sends a user message (and optional action). Returns false when nothing was sent. */
  send: (text: string, action?: AgentAction) => boolean;
  /** quote(state) for the live case, used to tell when an older price card is out of date. */
  livePrice: PriceCardData | null;
  /** payChecklist(state) for the live case: what the founder settles before Confirm & pay unlocks. */
  payChecklist: PayCheck[];
  isPartial: (card: PriceCardData) => boolean;
  exportFile: (ext: "md" | "json") => ExportFile | null;
}

const AtlasUiContext = createContext<AtlasUi | null>(null);

export const AtlasUiProvider = AtlasUiContext.Provider;

export function useAtlasUi(): AtlasUi {
  const ctx = useContext(AtlasUiContext);
  if (!ctx) throw new Error("useAtlasUi needs an <AtlasUiProvider>");
  return ctx;
}
