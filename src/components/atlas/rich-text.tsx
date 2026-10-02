// A tiny markdown subset for agent text and card strings: paragraphs, - and 1. lists, **bold**,
// *italic*, `code`, links, bare URLs, filing refs in mono, and [source:id] → a source chip.
import { Fragment, type ReactNode } from "react";
import { SOURCES } from "@/lib/atlas/kb";
import { SourceChip, cx } from "./ui";

const TOKEN = new RegExp(
  [
    String.raw`\*\*(?<bold>[^*\n]+?)\*\*`,
    String.raw`\[source:\s*(?<src>[a-z0-9][a-z0-9 ,-]*?)\s*\]`,
    String.raw`\[(?<ltext>[^\]\n]+)\]\((?<lurl>https?:\/\/[^\s)]+)\)`,
    String.raw`\[(?<bare>[a-z0-9]+(?:-[a-z0-9]+)+)\]`,
    String.raw`(?<url>https?:\/\/[^\s<>()]+[^\s<>().,;:!?'")\]])`,
    String.raw`\x60(?<code>[^\x60\n]+)\x60`,
    String.raw`(?<![\w*])\*(?<em>[^*\s][^*\n]*?)\*(?![\w*])`,
    String.raw`(?<ref>\b[A-Z][A-Z0-9]{1,9}(?:-[A-Z0-9]{1,9})*-\d{4,}\b)`,
  ].join("|"),
  "g",
);

const LINK = "font-medium text-accent-ink underline decoration-accent/40 underline-offset-2 hover:decoration-accent";

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function renderInline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const g = m.groups ?? {};
    const k = `${key}.${n++}`;
    // A citation keeps the punctuation that follows it, so a chip never wraps away from its full stop.
    const trail = g.src !== undefined || g.bare !== undefined ? (/^[.,;:!?)]/.exec(text.slice(at + m[0].length))?.[0] ?? "") : "";
    if (g.bold !== undefined) {
      out.push(
        <strong key={k} className="font-semibold text-ink">
          {renderInline(g.bold, k)}
        </strong>,
      );
    } else if (g.src !== undefined) {
      const ids = g.src.split(/[\s,]+/).filter((id) => SOURCES[id]);
      if (ids.length) {
        out.push(
          <span key={k} className="whitespace-nowrap">
            {ids.map((id) => (
              <SourceChip key={id} id={id} />
            ))}
            {trail}
          </span>,
        );
      } else if (trail) {
        out.push(trail);
      }
    } else if (g.lurl !== undefined) {
      out.push(
        <a key={k} href={g.lurl} target="_blank" rel="noopener noreferrer" className={LINK}>
          {g.ltext}
        </a>,
      );
    } else if (g.bare !== undefined) {
      out.push(
        SOURCES[g.bare] ? (
          <span key={k} className="whitespace-nowrap">
            <SourceChip id={g.bare} />
            {trail}
          </span>
        ) : (
          m[0] + trail
        ),
      );
    } else if (g.url !== undefined) {
      out.push(
        <a key={k} href={g.url} target="_blank" rel="noopener noreferrer" className={cx(LINK, "break-all")}>
          {prettyUrl(g.url)}
        </a>,
      );
    } else if (g.code !== undefined) {
      out.push(
        <code key={k} className="rounded-md bg-sunken px-1.5 py-px font-mono text-[0.88em]">
          {g.code}
        </code>,
      );
    } else if (g.em !== undefined) {
      out.push(<em key={k}>{renderInline(g.em, k)}</em>);
    } else if (g.ref !== undefined) {
      out.push(
        <span key={k} translate="no" className="whitespace-nowrap font-mono text-[0.9em] tracking-tight">
          {g.ref}
        </span>,
      );
    }
    last = at + m[0].length + trail.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Inline-only rendering for card strings (reasons, flags, notes). */
export function RichInline({ text }: { text: string | undefined | null }) {
  if (!text) return null;
  return <>{renderInline(text)}</>;
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[]; start: number };

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", lines: para });
    para = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const last = blocks[blocks.length - 1];
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*(\d{1,3})[.)]\s+(.*)$/.exec(line);
    if (ul) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "ul") prev.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
      continue;
    }
    if (ol) {
      flush();
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "ol") prev.items.push(ol[2]);
      else blocks.push({ kind: "ol", items: [ol[2]], start: Number(ol[1]) || 1 });
      continue;
    }
    // An indented line right after a list item continues that item.
    if (!para.length && /^\s{2,}\S/.test(raw) && (last?.kind === "ul" || last?.kind === "ol")) {
      last.items[last.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    // The agent is told not to use headings or tables; if one slips through, keep it readable.
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: "p", lines: [`**${heading[1].replace(/\*\*/g, "")}**`] });
      continue;
    }
    if (/^\s*\|?\s*:?-{3,}/.test(line)) continue;
    para.push(/^\s*\|/.test(line) ? line.replace(/^\s*\|\s*|\s*\|\s*$/g, "").replace(/\s*\|\s*/g, " · ") : line);
  }
  flush();
  return blocks;
}

/** While streaming, hide a half-typed [source:… and an unclosed ** so markup never flashes. */
function trimPartial(text: string): string {
  let s = text.replace(/\[(?:s(?:o(?:u(?:r(?:c(?:e(?::[^\]\n]*)?)?)?)?)?)?)?$/, "");
  const marks = s.match(/\*\*/g)?.length ?? 0;
  if (marks % 2 === 1) {
    const i = s.lastIndexOf("**");
    s = s.slice(0, i) + s.slice(i + 2);
  }
  return s;
}

export function RichText({ text, streaming = false, className }: { text: string; streaming?: boolean; className?: string }) {
  const blocks = parseBlocks(streaming ? trimPartial(text) : text);
  if (!blocks.length) return null;
  return (
    <div className={cx("space-y-3 text-[16px] leading-[1.65] text-ink [overflow-wrap:anywhere]", className)}>
      {blocks.map((b, i) => {
        if (b.kind === "p") {
          return (
            <p key={i} className="text-pretty">
              {b.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  {renderInline(line, `${i}.${j}`)}
                </Fragment>
              ))}
            </p>
          );
        }
        const items = b.items.map((item, j) => (
          <li key={j} className="pl-1">
            {renderInline(item, `${i}.${j}`)}
          </li>
        ));
        return b.kind === "ul" ? (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-muted">
            {items}
          </ul>
        ) : (
          <ol key={i} start={b.start} className="list-decimal space-y-1.5 pl-5 marker:text-muted marker:tabular-nums">
            {items}
          </ol>
        );
      })}
    </div>
  );
}
