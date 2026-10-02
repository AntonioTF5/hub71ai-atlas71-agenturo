// A minimal PDF writer for the sandbox documents in the landing pack: A4 pages set in Helvetica, with a
// banner and a diagonal watermark on every page so a simulated certificate can never pass for a real one.
// Text is limited to WinAnsi-safe ASCII; anything else is transliterated.

export type Block =
  | { t: "p"; text: string; muted?: boolean } // a paragraph, wrapped
  | { t: "h"; text: string } // a section heading
  | { t: "kv"; rows: [string, string][] } // label and value rows
  | { t: "list"; items: string[] }; // bulleted lines

export interface SimDoc {
  /** The line above the title: who the document simulates, e.g. "Simulating: ADGM Registration Authority". */
  issuer: string;
  title: string;
  /** Reference shown under the title and in the footer. */
  reference?: string;
  issuedOn: string; // already formatted
  blocks: Block[];
  /** Footer line, e.g. "Atlas71 sandbox · generated 2 Oct 2026". */
  footer: string;
}

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const TEXT_W = PAGE_W - MARGIN * 2;
const BOTTOM = 70;

// Helvetica advance widths (1/1000 em) for ASCII 32 to 126, from the standard AFM.
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778,
  722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const INK = "0.063 0.094 0.157";
const MUTED = "0.365 0.400 0.459";
const ACCENT = "0.055 0.486 0.455";
const GOLD_INK = "0.541 0.392 0.086";
const GOLD_SOFT = "0.973 0.945 0.882";
const RULE = "0.812 0.796 0.749";

/** Map typographic characters to ASCII so the standard fonts can draw them. */
export function pdfSafe(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/…/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/×/g, "x")
    .replace(/→/g, "->")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function width(text: string, size: number, bold = false): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) w += WIDTHS[text.charCodeAt(i) - 32] ?? 556;
  return (w / 1000) * size * (bold ? 1.06 : 1);
}

function wrap(text: string, size: number, max: number, bold = false): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (width(next, size, bold) <= max || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

class Pages {
  pages: string[][] = [];
  y = 0;
  readonly doc: SimDoc;
  constructor(doc: SimDoc) {
    this.doc = doc;
    this.newPage();
  }

  get ops(): string[] {
    return this.pages[this.pages.length - 1];
  }

  newPage() {
    this.pages.push([]);
    const o = this.ops;
    // Watermark first, so the text sits on top of it.
    o.push(`q 0.93 g BT /F2 96 Tf 0.819 0.574 -0.574 0.819 64 210 Tm (SIMULATION) Tj ET Q`);
    // Banner across the top.
    o.push(`q ${GOLD_SOFT} rg 0 ${PAGE_H - 30} ${PAGE_W} 30 re f Q`);
    o.push(this.text(MARGIN, PAGE_H - 19, "SANDBOX SIMULATION - NOT AN OFFICIAL DOCUMENT - ISSUED BY NO AUTHORITY", 8.5, true, GOLD_INK));
    this.y = PAGE_H - 70;
  }

  text(x: number, y: number, s: string, size: number, bold = false, color = INK): string {
    return `BT ${color} rg /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(pdfSafe(s))}) Tj ET`;
  }

  need(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }

  line(s: string, size: number, opts: { bold?: boolean; color?: string; x?: number; lead?: number } = {}) {
    const lead = opts.lead ?? size * 1.4;
    this.need(lead);
    this.y -= lead;
    this.ops.push(this.text(opts.x ?? MARGIN, this.y, s, size, opts.bold, opts.color));
  }

  rule(gapBefore = 10, gapAfter = 6) {
    this.need(gapBefore + gapAfter);
    this.y -= gapBefore;
    this.ops.push(`q ${RULE} RG 0.75 w ${MARGIN} ${this.y.toFixed(2)} m ${PAGE_W - MARGIN} ${this.y.toFixed(2)} l S Q`);
    this.y -= gapAfter;
  }

  block(b: Block) {
    if (b.t === "p") {
      this.y -= 4;
      for (const l of wrap(b.text, 10.5, TEXT_W)) this.line(l, 10.5, { color: b.muted ? MUTED : INK, lead: 15 });
    } else if (b.t === "h") {
      this.y -= 10;
      this.line(b.text.toUpperCase(), 8.5, { bold: true, color: ACCENT, lead: 14 });
    } else if (b.t === "kv") {
      this.y -= 4;
      const labelW = 150;
      for (const [k, v] of b.rows) {
        const lines = wrap(v, 10.5, TEXT_W - labelW, true);
        this.need(lines.length * 15 + 4);
        lines.forEach((l, i) => {
          this.y -= 15;
          if (i === 0) this.ops.push(this.text(MARGIN, this.y, k, 9.5, false, MUTED));
          this.ops.push(this.text(MARGIN + labelW, this.y, l, 10.5, true));
        });
        this.y -= 3;
      }
    } else {
      this.y -= 4;
      for (const item of b.items) {
        const lines = wrap(item, 10.5, TEXT_W - 14);
        lines.forEach((l, i) => {
          this.line(l, 10.5, { x: MARGIN + 14, lead: 15 });
          if (i === 0) this.ops.push(this.text(MARGIN + 2, this.y, "-", 10.5, true, ACCENT));
        });
      }
    }
  }

  render(): string[] {
    const d = this.doc;
    this.line(d.issuer, 9.5, { color: MUTED, lead: 0 });
    for (const l of wrap(d.title, 22, TEXT_W, true)) this.line(l, 22, { bold: true, lead: 30 });
    this.line(`${d.reference ? `Ref ${d.reference}  -  ` : ""}Issued ${d.issuedOn}`, 9.5, { color: MUTED, lead: 18 });
    this.rule(14, 4);
    for (const b of d.blocks) this.block(b);
    // Footer with page numbers, once the page count is known.
    const n = this.pages.length;
    this.pages.forEach((ops, i) => {
      ops.push(`q ${RULE} RG 0.5 w ${MARGIN} 48 m ${PAGE_W - MARGIN} 48 l S Q`);
      ops.push(this.text(MARGIN, 34, d.footer, 8, false, MUTED));
      const label = `Page ${i + 1} of ${n}`;
      ops.push(this.text(PAGE_W - MARGIN - width(label, 8), 34, label, 8, false, MUTED));
    });
    return this.pages.map((ops) => ops.join("\n"));
  }
}

/** Render one simulated document as PDF bytes. */
export function buildPdf(doc: SimDoc): Uint8Array<ArrayBuffer> {
  const streams = new Pages(doc).render();
  const objects: string[] = [];
  const fontDict = (name: string) => `<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>`;
  const pageIds = streams.map((_, i) => 6 + i * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${streams.length} >>`;
  objects[3] = fontDict("Helvetica");
  objects[4] = fontDict("Helvetica-Bold");
  objects[5] = `<< /Title (${esc(pdfSafe(`${doc.title} (simulated)`))}) /Producer (Atlas71 sandbox) /Subject (Sandbox simulation, not an official document) >>`;
  streams.forEach((s, i) => {
    const pageId = pageIds[i];
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = out.length;
    out += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) out += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  // Everything above is ASCII, so string offsets are byte offsets.
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0x7f;
  return bytes;
}
