"use client";

import { Component, type ReactNode } from "react";
import type { Card } from "@/lib/atlas/types";
import { IconAlert } from "../icons";
import { BankFileCard } from "./BankFileCard";
import { CompareCard } from "./CompareCard";
import { ExportCard } from "./ExportCard";
import { FilingsCard } from "./FilingsCard";
import { PlanCard } from "./PlanCard";
import { PriceCard } from "./PriceCard";
import { RouteCard } from "./RouteCard";
import { UpdatesCard } from "./UpdatesCard";

/** One malformed card must never take the conversation down with it. */
class CardBoundary extends Component<{ children: ReactNode; kind: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.error(`[atlas71] ${this.props.kind} card failed to render`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface px-4 py-3 text-[14px] text-muted">
          <IconAlert size={18} className="shrink-0" />
          This card couldn&apos;t be shown. The rest of your case is safe; ask Atlas71 to show it again.
        </div>
      );
    }
    return this.props.children;
  }
}

function CardBody({ card }: { card: Card }) {
  switch (card.kind) {
    case "route":
      return <RouteCard data={card.data} />;
    case "plan":
      return <PlanCard data={card.data} />;
    case "price":
      return <PriceCard data={card.data} />;
    case "filings":
      return <FilingsCard data={card.data} />;
    case "updates":
      return <UpdatesCard data={card.data} />;
    case "bank_file":
      return <BankFileCard data={card.data} />;
    case "export":
      return <ExportCard data={card.data} />;
    case "compare":
      return <CompareCard data={card.data} />;
    default:
      return null;
  }
}

export function CardView({ card }: { card: Card }) {
  return (
    <CardBoundary kind={card.kind}>
      <CardBody card={card} />
    </CardBoundary>
  );
}
