// Turns the chat into the compact history the agent sees: text only, plus one-line notes for cards
// and choices. Old tool calls are never replayed; the case summary in the system prompt carries state.
import type { AgentRequest, Card } from "./types";
import { attachmentNote, type ChatMessageWithFiles } from "./attachments.ts";
import { aed } from "./format.ts";

export function cardNote(card: Card): string {
  switch (card.kind) {
    case "route": {
      const r = card.data.recommended;
      if (!card.data.checksMeta.live) return "(shown: route card, eligibility check unavailable)";
      return `(shown: route card, recommended ${r.name}${r.licenceAed ? `, licence ${aed(r.licenceAed)}` : ""})`;
    }
    case "plan":
      return `(shown: plan card, ${card.data.routeName})`;
    case "price":
      return `(shown: price card, total ${aed(card.data.totalAed)}${card.data.paid ? ", paid" : ""})`;
    case "filings":
      return `(shown: filings card, ${card.data.items.map((i) => i.title).join("; ")})`;
    case "updates":
      return `(shown: updates card, ${card.data.from} to ${card.data.to}, ${card.data.events.length} events)`;
    case "bank_file":
      return card.data.ready
        ? "(shown: bank file card, prepared for bank review)"
        : `(shown: bank file card, not ready: ${card.data.checks
            .filter((c) => c.verdict !== "pass")
            .map((c) => c.label)
            .join("; ") || card.data.missing.join("; ")})`;
    case "export":
      return "(shown: export card)";
    case "compare":
      return `(shown: Abu Dhabi vs ${card.data.homeLabel} comparison: ${card.data.verdict})`;
  }
}

function messageText(m: ChatMessageWithFiles): string {
  const out: string[] = [];
  if (m.attachments?.length) out.push(attachmentNote(m.attachments));
  for (const part of m.parts) {
    if (part.type === "text" && part.text.trim()) out.push(part.text.trim());
    else if (part.type === "card") out.push(cardNote(part.card));
    else if (part.type === "choices") out.push(`(offered choices: ${part.options.join(" | ")})`);
  }
  return out.join("\n");
}

/** History for POST /api/agent: alternating roles, starting with the user, last `max` turns. */
export function toLlmHistory(messages: ChatMessageWithFiles[], max = 40): AgentRequest["messages"] {
  const out: AgentRequest["messages"] = [];
  for (const m of messages) {
    const content = messageText(m);
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${content}`;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  const trimmed = out.slice(-max);
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}
