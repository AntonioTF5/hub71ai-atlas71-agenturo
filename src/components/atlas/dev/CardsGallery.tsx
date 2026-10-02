"use client";

// Dev-only gallery: every card, message state and tracker state rendered from fixtures, no server.
import { useMemo, type ReactNode } from "react";
import type { CaseState } from "@/lib/atlas/types";
import { emptyCase } from "@/lib/atlas/personas";
import { CardView } from "../cards/CardView";
import { AtlasUiProvider, type AtlasUi } from "../context";
import * as F from "../fixtures";
import { derive, exportCase, isPartialPrice } from "../live";
import { MessageView } from "../Message";
import type { UiMessage } from "../session";
import { saveSession } from "../storage";
import { TrackerPanel } from "../Tracker";

const noop = () => undefined;

function Fixture({ state, busy = false, children }: { state: CaseState; busy?: boolean; children: ReactNode }) {
  const ui = useMemo<AtlasUi>(
    () => ({
      state,
      busy,
      send: (text) => {
        console.info("[gallery] send:", text);
        return false;
      },
      livePrice: derive(state).price,
      isPartial: isPartialPrice,
      exportFile: (ext) => exportCase(state, ext),
    }),
    [state, busy],
  );
  return <AtlasUiProvider value={ui}>{children}</AtlasUiProvider>;
}

function Label({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="mb-2 pt-10 font-mono text-[12px] uppercase tracking-[0.08em] text-muted">
      {children}
    </p>
  );
}

function Messages({ messages, busy = false }: { messages: UiMessage[]; busy?: boolean }) {
  return (
    <div className="space-y-7">
      {messages.map((m, i) => (
        <MessageView
          key={m.id}
          message={m}
          isLast={i === messages.length - 1}
          busy={busy}
          nextUserText={
            m.role === "assistant" && messages[i + 1]?.role === "user"
              ? messages[i + 1].parts.map((p) => (p.type === "text" ? p.text : "")).join("")
              : undefined
          }
          onPick={noop}
          onRetry={noop}
        />
      ))}
    </div>
  );
}

const THINKING: UiMessage[] = [{ id: "t1", role: "assistant", parts: [], pending: true }];
const STREAMING: UiMessage[] = [
  {
    id: "s1",
    role: "assistant",
    pending: true,
    parts: [
      { type: "activity", text: "Saved Byteforge's facts", done: true },
      { type: "activity", text: "Checking eligibility with TypeSafe…", done: false },
      { type: "text", text: "Byteforge builds software for clients, so I'm checking whether the **startup licence** fits [source:adg" },
    ],
  },
];
const ERRORS: UiMessage[] = [
  { id: "e0", role: "user", parts: [{ type: "text", text: "Fast-forward 1 week" }], action: { type: "advance", days: 7 } },
  { id: "e1", role: "assistant", parts: [], error: "Connection lost. Try again." },
];
const SETUP: UiMessage[] = [{ id: "e2", role: "assistant", parts: [], error: "setup_required", noRetry: true }];
const FILES: UiMessage[] = [
  {
    id: "f1",
    role: "user",
    parts: [{ type: "text", text: "Here's our cap table and the SAFE summary." }],
    attachments: [
      { name: "routely-cap-table.pdf", mime: "application/pdf", size: 182_000 },
      { name: "safe-summary.jpg", mime: "image/jpeg", size: 412_000 },
    ],
  },
];

export default function CardsGallery() {
  const empty = useMemo(() => emptyCase(F.FIX_START), []);
  const sections: [string, ReactNode][] = [
    [
      "Conversation (Routely, paid case)",
      <Fixture key="c" state={F.statePaid}>
        <Messages messages={F.conversation} />
      </Fixture>,
    ],
    [
      "Message states",
      <Fixture key="m" state={F.stateUnpaid}>
        <div className="space-y-7">
          <Messages messages={THINKING} busy />
          <Messages messages={STREAMING} busy />
          <Messages messages={FILES} />
          <Messages messages={ERRORS} />
          <Messages messages={SETUP} />
        </div>
      </Fixture>,
    ],
  ];

  const cards: [string, CaseState, Parameters<typeof CardView>[0]["card"]][] = [
    ["Compare · Abu Dhabi vs Bangalore", F.stateFacts, { kind: "compare", data: F.compareCard }],
    ["Route · Routely (live TypeSafe)", F.stateUnpaid, { kind: "route", data: F.routeCard }],
    ["Route · Byteforge (service provider flagged)", F.stateByteforge, { kind: "route", data: F.routeCardByteforge }],
    ["Route · specialist review", F.stateFacts, { kind: "route", data: F.routeCardSpecialist }],
    ["Route · check didn't answer", F.stateFacts, { kind: "route", data: F.routeCardUnavailable }],
    ["Route · TypeSafe not set up", F.stateFacts, { kind: "route", data: F.routeCardSetup }],
    ["Plan · before payment", F.stateUnpaid, { kind: "plan", data: F.planCard }],
    ["Plan · day 21", F.statePaid, { kind: "plan", data: F.planCardLater }],
    ["Price · unpaid", F.stateUnpaid, { kind: "price", data: F.priceCard }],
    ["Price · paid", F.statePaid, { kind: "price", data: F.priceCardPaid }],
    ["Price · Masdar (partial)", F.stateByteforge, { kind: "price", data: F.priceCardMasdar }],
    ["Price · Byteforge ADGM", F.stateByteforge, { kind: "price", data: F.priceCardByteforge }],
    ["Filings", F.statePaid, { kind: "filings", data: F.filingsCard }],
    ["Updates · next event", F.statePaid, { kind: "updates", data: F.updatesCard }],
    ["Updates · +2 weeks", F.statePaid, { kind: "updates", data: F.updatesCardEarly }],
    ["Bank file · flagged", F.statePaid, { kind: "bank_file", data: F.bankFileCard }],
    ["Bank file · prepared", F.statePaid, { kind: "bank_file", data: F.bankFileReady }],
    ["Export", F.statePaid, { kind: "export", data: F.exportCard }],
  ];

  const trackers: [string, CaseState][] = [
    ["Tracker · empty", empty],
    ["Tracker · facts, no route", F.stateFacts],
    ["Tracker · route, unpaid", F.stateUnpaid],
    ["Tracker · paid, day 21", F.statePaid],
  ];

  return (
    <div className="min-h-dvh bg-paper pb-24">
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <h1 className="text-[18px] font-semibold text-ink">Atlas71 · card gallery</h1>
        <p className="text-[13px] text-muted">Dev only. Fixtures from the real engine; buttons log instead of sending.</p>
        <nav className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
          <a className="text-accent-ink underline" href="#conversation">Conversation</a>
          <a className="text-accent-ink underline" href="#cards">Cards</a>
          <a className="text-accent-ink underline" href="#trackers">Trackers</a>
          <button
            type="button"
            className="text-accent-ink underline"
            onClick={() => {
              saveSession({ state: F.statePaid, messages: F.conversation });
              window.location.href = "/";
            }}
          >
            Open the app with this case
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 pt-8 sm:px-6">
        <div id="conversation" className="scroll-mt-4">
          {sections.map(([label, node]) => (
            <div key={label}>
              <Label>{label}</Label>
              {node}
            </div>
          ))}
        </div>
        <div id="cards" className="scroll-mt-4">
          {cards.map(([label, state, card]) => (
            <div key={label}>
              <Label>{label}</Label>
              <Fixture state={state}>
                <CardView card={card} />
              </Fixture>
            </div>
          ))}
        </div>
      </main>

      <section id="trackers" className="mx-auto mt-14 w-full max-w-[1640px] scroll-mt-4 px-4 sm:px-6">
        <Label>Tracker states</Label>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {trackers.map(([label, state]) => {
            const d = derive(state);
            return (
              <div key={label} className="min-w-0">
                <p className="mb-2 text-[13px] font-medium text-muted">{label}</p>
                <div className="overflow-hidden rounded-card border border-line bg-surface sm:w-[380px]">
                  <Fixture state={state}>
                    <TrackerPanel
                      state={state}
                      plan={d.plan}
                      price={d.price}
                      partial={d.price ? isPartialPrice(d.price) : false}
                      waiting={d.waiting}
                      day={d.day}
                      busy={false}
                      onAdvance={noop}
                    />
                  </Fixture>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
