import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32 as zlibCrc32 } from "node:zlib";
import type { CaseState } from "../src/lib/atlas/types.ts";
import {
  advance,
  applyInvestorDocs,
  completeBankFile,
  documentsCard,
  INVESTOR_DOCS_OPTION,
  missingFacts,
  payChecklist,
  provideInput,
  readyToPay,
  sandboxIdentities,
  saveIdentities,
  startLanding,
} from "../src/lib/atlas/engine.ts";
import { applyProfile } from "../src/lib/atlas/profile.ts";
import { emptyCase } from "../src/lib/atlas/personas.ts";
import { buildZipPack, packDocuments, zipFileName } from "../src/lib/atlas/pack.ts";
import { buildPdf, pdfSafe } from "../src/lib/atlas/simpdf.ts";
import { buildZip, crc32 } from "../src/lib/atlas/zip.ts";

const START = "2026-10-02";

/** Routely after the price, with everything payment needs except the bank facts. */
function routely(): CaseState {
  let { state: s } = applyProfile(emptyCase(START, "routely"), {
    company: "Routely",
    description: "Route-planning SaaS for delivery fleets.",
    homeBase: "Bangalore, India",
    fundingUsd: 600000,
    hub71Letter: "none",
    monthlyVolumeUsd: 40000,
    transactionCountries: "UAE, Saudi Arabia, India",
    people: [
      { name: "Meera Iyer", role: "founder", relocating: true },
      { name: "Arjun Rao", role: "founder", relocating: false },
    ],
    dependants: [
      { relation: "spouse", sponsorName: "Meera", name: "Rohan" },
      { relation: "child", sponsorName: "Meera", name: "Anya" },
    ],
  });
  s = { ...s, route: "adgm_tsl", inputs: { ...s.inputs, quoted: START } };
  s = provideInput(s, "consent:hub71_letter", "Yes, apply for me").state;
  s = saveIdentities(s, sandboxIdentities(s)).state;
  s = provideInput(s, "entry:Meera", "Already in the UAE").state;
  return provideInput(s, "documents:all", "They're legalised and ready").state;
}

/** The same case landed: paid, licensed, resident, banked and live on payments. */
function landed(): CaseState {
  let s = applyInvestorDocs(routely()).state;
  s = startLanding(s).state;
  s = advance(s, { days: 28 }).state;
  s = advance(s, { untilNextEvent: true }).state;
  s = provideInput(s, "medical:Meera", "Tue 3 Nov, 09:00 · SEHA Al Bateen").state;
  s = advance(s, { days: 14 }).state;
  const bankFile = { sections: [{ title: "Source of funds", body: s.profile.fundingSource ?? "" }], missing: [], checks: [], meta: { live: true }, ready: true, profileKey: "x" };
  s = completeBankFile({ ...s, bankFile }).state;
  return advance(s, { days: 28 }).state;
}

test("the demo founder can answer the bank facts with her uploaded investor documents", () => {
  const s = routely();
  const bank = payChecklist(s).find((c) => c.key === "bank")!;
  assert.equal(bank.done, false);
  assert.deepEqual(bank.options, [INVESTOR_DOCS_OPTION, "I'll attach documents"]);

  const r = applyInvestorDocs(s);
  assert.ok(r.docs);
  assert.deepEqual(r.changed.sort(), ["fundingSource", "ownership"]);
  assert.deepEqual(missingFacts(r.state).bank, []);
  assert.match(r.state.profile.fundingSource ?? "", /Andreessen Horowitz \(a16z\).*post-money SAFE for 10%/);
  assert.match(r.state.profile.ownership ?? "", /Meera Iyer 45%, Arjun Rao 45%/);
  assert.ok(readyToPay(r.state));

  const card = documentsCard(r.docs!);
  assert.deepEqual(card.facts.map((f) => f.label), ["Investor", "Amount", "Instrument", "Stake", "Cap table"]);
  assert.equal(card.facts[1].value, "USD 600,000");

  // A founder without uploaded documents types the answer; no taps that answer nothing.
  const other = { ...s, persona: "byteforge" as const };
  assert.equal(payChecklist(other).find((c) => c.key === "bank")!.options, undefined);
  assert.equal(applyInvestorDocs(other).docs, null);
});

test("the ZIP is a valid archive: names, sizes and CRCs check out against zlib", () => {
  const zip = buildZip([{ path: "pack/a.txt", data: "hello" }, { path: "pack/b.bin", data: new Uint8Array([0, 1, 2, 255]) }], START);
  assert.equal(crc32(new TextEncoder().encode("hello")), zlibCrc32("hello"));
  const v = new DataView(zip.buffer);
  const eocd = zip.length - 22;
  assert.equal(v.getUint32(eocd, true), 0x06054b50);
  assert.equal(v.getUint16(eocd + 10, true), 2);
  let at = v.getUint32(eocd + 16, true); // central directory
  const names: string[] = [];
  for (let i = 0; i < 2; i++) {
    assert.equal(v.getUint32(at, true), 0x02014b50);
    const crc = v.getUint32(at + 16, true);
    const size = v.getUint32(at + 20, true);
    const nameLen = v.getUint16(at + 28, true);
    const local = v.getUint32(at + 42, true);
    names.push(new TextDecoder().decode(zip.subarray(at + 46, at + 46 + nameLen)));
    assert.equal(v.getUint32(local, true), 0x04034b50);
    const dataAt = local + 30 + v.getUint16(local + 26, true);
    assert.equal(zlibCrc32(zip.subarray(dataAt, dataAt + size)), crc);
    at += 46 + nameLen;
  }
  assert.deepEqual(names, ["pack/a.txt", "pack/b.bin"]);
});

test("each simulated PDF is well formed and says it is a simulation", () => {
  const pdf = buildPdf({
    issuer: "Simulating: ADGM Registration Authority",
    title: "Certificate of incorporation",
    reference: "ADGM-RA-2026-00001",
    issuedOn: "23 Oct 2026",
    blocks: [{ t: "kv", rows: [["Company", "Routely"]] }, { t: "p", text: "A paragraph. ".repeat(400) }],
    footer: "Atlas71 sandbox",
  });
  const text = new TextDecoder().decode(pdf);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.ok(text.includes("(SANDBOX SIMULATION - NOT AN OFFICIAL DOCUMENT - ISSUED BY NO AUTHORITY)"));
  assert.ok(text.includes("/Count 2"), "a long document flows onto a second page");
  // Every xref entry points at the start of its object.
  const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
  const rows = text.slice(xref).split("\n").slice(3).filter((l) => / 00000 n $/.test(l));
  rows.forEach((row, i) => assert.ok(text.startsWith(`${i + 1} 0 obj`, Number(row.slice(0, 10))), `object ${i + 1}`));
  assert.equal(pdfSafe("Abu Dhabi · 150 ms – it’s “ok”…"), "Abu Dhabi - 150 ms - it's \"ok\"...");
});

test("the pack holds a document for each issued step, and only those", () => {
  assert.deepEqual(packDocuments(routely()), [], "nothing is issued before payment");
  const s = landed();
  const paths = packDocuments(s).map((d) => d.path);
  for (const p of [
    "01-company/hub71-eligibility-letter.pdf",
    "01-company/certificate-of-incorporation.pdf",
    "01-company/commercial-licence.pdf",
    "01-company/establishment-card.pdf",
    "02-people/meera-iyer-residence-visa-emirates-id.pdf",
    "02-people/rohan-dependant-visa.pdf",
    "03-money-and-tax/corporate-tax-registration.pdf",
    "03-money-and-tax/wio-business-account.pdf",
    "03-money-and-tax/atlas71-receipt.pdf",
    "04-founder-documents/investor-safe-summary.pdf",
    "04-founder-documents/cap-table.pdf",
  ]) {
    assert.ok(paths.includes(p), p);
  }
  assert.ok(!paths.some((p) => p.includes("arjun")), "no visa documents for a founder who stays");

  const zip = buildZipPack(s);
  const names = new TextDecoder("latin1").decode(zip);
  assert.ok(names.includes("atlas71-routely-landing-pack/README.md"));
  assert.ok(names.includes("atlas71-routely-landing-pack/case.json"));
  assert.match(zipFileName(s), /^atlas71-routely-landing-pack-\d{4}-\d{2}-\d{2}\.zip$/);
});
