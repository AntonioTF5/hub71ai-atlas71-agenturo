// The landing pack as one ZIP: the Markdown summary, the case file, and a simulated PDF for every document the
// landing has produced so far (licence, certificates, visas, bank, receipt). Built in the browser from CaseState.
// Every PDF says on each page that it is a sandbox simulation issued by no authority.
import type { CaseState, Filing } from "./types";
import { FEES, ROUTES } from "./kb.ts";
import {
  buildPlan,
  checkoutCard,
  deskCount,
  investorDocsFor,
  isRoute,
  providerFor,
  relocating,
  signatoryOf,
  slug,
  visasPerDesk,
  whoFor,
} from "./engine.ts";
import { buildJsonPack, buildMarkdownPack } from "./export.ts";
import { addDays, addMonths, aed, fmtDateLong } from "./format.ts";
import { buildPdf, type Block, type SimDoc } from "./simpdf.ts";
import { buildZip, type ZipEntry } from "./zip.ts";

export interface PackDocument {
  /** Path inside the pack folder, e.g. "01-company/certificate-of-incorporation.pdf". */
  path: string;
  title: string;
  doc: SimDoc;
}

const FOLDER = { company: "01-company", people: "02-people", money: "03-money-and-tax", founder: "04-founder-documents" };

export function zipFileName(state: CaseState): string {
  return `atlas71-${slug(state.profile.company ?? "case")}-landing-pack-${state.today}.zip`;
}

/** The documents the case has produced so far, cheap to list (the PDFs render only when zipped). */
export function packDocuments(state: CaseState): PackDocument[] {
  const route = state.route;
  const p = state.profile;
  const company = p.company ?? "The company";
  const footer = `Atlas71 sandbox - generated ${fmtDateLong(state.today)} - simulated for a demo, not issued by any authority`;
  const out: PackDocument[] = [];
  const done = (step: Filing["step"], subjectId?: string) =>
    state.filings.find((f) => f.step === step && f.status === "done" && f.doneOn && (!subjectId || f.subjectId === subjectId));
  // Authorities and providers get "Simulating:"; Atlas71's own receipt and the founder's uploads say who made them.
  const add = (folder: string, file: string, doc: Omit<SimDoc, "footer">, own = false) =>
    out.push({ path: `${folder}/${file}.pdf`, title: doc.title, doc: { ...doc, issuer: own ? doc.issuer : `Simulating: ${doc.issuer}`, footer } });
  const sig = signatoryOf(p);
  const ids = state.identities ?? {};
  const passport = (id: string) => (ids[id] ? `**** ${ids[id].passportLast4}` : "On file with Atlas71");
  const nationality = (id: string, fallback?: string | null) => ids[id]?.nationality ?? fallback ?? "On file with Atlas71";

  if (isRoute(route)) {
    const r = ROUTES[route];
    const masdar = route === "masdar";

    const letter = done("hub71_letter");
    if (letter?.doneOn) {
      add(FOLDER.company, "hub71-eligibility-letter", {
        issuer: "Hub71",
        title: "Hub71 eligibility letter",
        reference: letter.ref,
        issuedOn: fmtDateLong(letter.doneOn),
        blocks: [
          { t: "p", text: `This letter confirms that ${company} is eligible to apply for the ADGM Tech Startup Licence.` },
          { t: "kv", rows: [["Company", company], ["Purpose", "Application for the ADGM Tech Startup Licence"], ["Reference", letter.ref]] },
          { t: "p", text: "Separate from Hub71's selective Access programme: it carries no funding and no programme place.", muted: true },
        ],
      });
    }

    const desk = done("desk");
    if (desk?.doneOn) {
      const desks = deskCount(p, route);
      add(FOLDER.company, "dedicated-desk-agreement", {
        issuer: "ADGM-zone coworking operator",
        title: "Dedicated desk agreement",
        reference: desk.ref,
        issuedOn: fmtDateLong(desk.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Licensee", company],
              ["Desks", `${desks} dedicated ${desks > 1 ? "desks" : "desk"}`],
              ["Visa allocation", `${desks * visasPerDesk(route)} visas (${visasPerDesk(route)} per desk)`],
              ["Term", `12 months from ${fmtDateLong(desk.doneOn)}`],
              ["Fee", `${aed(desks * FEES.desk)} a year`],
            ],
          },
        ],
      });
    }

    const inc = done("incorporation");
    if (inc?.doneOn) {
      const registry = masdar ? "Masdar City Free Zone" : "ADGM Registration Authority";
      add(FOLDER.company, "certificate-of-incorporation", {
        issuer: registry,
        title: "Certificate of incorporation",
        reference: inc.ref,
        issuedOn: fmtDateLong(inc.doneOn),
        blocks: [
          {
            t: "p",
            text: masdar
              ? `This certifies that ${company} is registered in the Masdar City Free Zone.`
              : `This certifies that ${company} is incorporated in the Abu Dhabi Global Market as a private company limited by shares.`,
          },
          {
            t: "kv",
            rows: [
              ["Company", company],
              ["Registered number", inc.ref],
              ["Incorporated on", fmtDateLong(inc.doneOn)],
              ["Jurisdiction", masdar ? "Masdar City Free Zone, Abu Dhabi, UAE" : "Abu Dhabi Global Market, Abu Dhabi, UAE"],
              ["Law", r.law],
              ...(p.ownership ? ([["Ownership", p.ownership]] as [string, string][]) : []),
            ],
          },
        ],
      });
      const quota = masdar ? `${r.includedVisas ?? 2} visas included` : `${deskCount(p, route) * visasPerDesk(route)} visas`;
      add(FOLDER.company, "commercial-licence", {
        issuer: registry,
        title: "Commercial licence",
        reference: inc.ref,
        issuedOn: fmtDateLong(inc.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Licensee", company],
              ["Licence", r.name],
              ["Licence number", inc.ref],
              ["Activity", p.description ?? "As registered"],
              ["Valid", `${fmtDateLong(inc.doneOn)} to ${fmtDateLong(addDays(addMonths(inc.doneOn, 12), -1))}`],
              ["Authorised signatory", sig?.name ?? "On file"],
              ["Visa quota", quota],
            ],
          },
        ],
      });
    }

    const est = done("establishment_card");
    if (est?.doneOn) {
      add(FOLDER.company, "establishment-card", {
        issuer: providerFor(route, "establishment_card"),
        title: "Establishment card",
        reference: est.ref,
        issuedOn: fmtDateLong(est.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Establishment", company],
              ["Card number", est.ref],
              ["e-Channels account", "Active"],
              ["Authorised signatory", sig?.name ?? "On file"],
            ],
          },
        ],
      });
    }

    for (const person of relocating(p)) {
      const who = person.name;
      const name = ids[person.id]?.fullName ?? who;
      const file = slug(who);
      const ep = done("entry_permit", person.id);
      if (ep?.doneOn) {
        add(FOLDER.people, `${file}-entry-permit`, {
          issuer: providerFor(route, "entry_permit"),
          title: "Entry permit and work permit",
          reference: ep.ref,
          issuedOn: fmtDateLong(ep.doneOn),
          blocks: [
            {
              t: "kv",
              rows: [
                ["Name", name],
                ["Nationality", nationality(person.id, person.nationality)],
                ["Passport", passport(person.id)],
                ["Sponsor", company],
                ["Permit", "Employment"],
              ],
            },
          ],
        });
      }
      const med = done("medical", person.id);
      if (med?.doneOn) {
        const slot = state.inputs[`medical:${person.id}`];
        add(FOLDER.people, `${file}-medical-fitness`, {
          issuer: "SEHA",
          title: "Medical fitness certificate",
          reference: med.ref,
          issuedOn: fmtDateLong(med.doneOn),
          blocks: [
            {
              t: "kv",
              rows: [
                ["Name", name],
                ["Result", "Fit"],
                ["Centre", slot?.split(/\s[·-]\s/).pop()?.trim() || "SEHA screening centre"],
                ["Purpose", "Residence visa"],
              ],
            },
          ],
        });
      }
      const eid = done("emirates_id", person.id);
      if (eid?.doneOn) {
        const born = ids[person.id]?.dateOfBirth?.slice(0, 4) ?? "1990";
        const digits = eid.ref.replace(/\D/g, "").padStart(8, "0");
        add(FOLDER.people, `${file}-residence-visa-emirates-id`, {
          issuer: "ICP",
          title: "Residence visa and Emirates ID",
          reference: eid.ref,
          issuedOn: fmtDateLong(eid.doneOn),
          blocks: [
            {
              t: "kv",
              rows: [
                ["Name", name],
                ["Nationality", nationality(person.id, person.nationality)],
                ["Emirates ID", `784-${born}-${digits.slice(0, 7)}-${digits.slice(7, 8)}`],
                ["Residence visa", "Employment, 2 years"],
                ["Valid until", fmtDateLong(addMonths(eid.doneOn, 24))],
                ["Sponsor", company],
              ],
            },
          ],
        });
      }
    }

    for (const d of p.dependants) {
      const dv = done("dependant_visa", d.id);
      if (!dv?.doneOn) continue;
      const sponsor = p.people.find((x) => x.id === d.sponsorId);
      const who = whoFor(p, "dependant_visa", d.id) ?? d.relation;
      add(FOLDER.people, `${slug(d.name ?? who)}-dependant-visa`, {
        issuer: "ICP",
        title: "Dependant residence visa",
        reference: dv.ref,
        issuedOn: fmtDateLong(dv.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Name", ids[d.id]?.fullName ?? who],
              ["Relation", d.relation === "child" ? "Child" : "Spouse"],
              ["Sponsor", sponsor?.name ?? "On file"],
              ["Passport", passport(d.id)],
              ["Validity", "Linked to the sponsor's residence visa"],
            ],
          },
        ],
      });
    }

    const tax = done("tax_registration");
    if (tax?.doneOn) {
      add(FOLDER.money, "corporate-tax-registration", {
        issuer: "Federal Tax Authority (EmaraTax)",
        title: "Corporate tax registration",
        reference: tax.ref,
        issuedOn: fmtDateLong(tax.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Taxable person", company],
              ["Tax registration number", tax.ref.replace(/^FTA-TRN-/, "")],
              ["Registered on", fmtDateLong(tax.doneOn)],
              ...(inc?.doneOn ? ([["Effective from", fmtDateLong(inc.doneOn)]] as [string, string][]) : []),
            ],
          },
        ],
      });
    }

    const bankFile = done("bank_file");
    if (bankFile?.doneOn && state.bankFile) {
      const blocks: Block[] = [];
      for (const s of state.bankFile.sections) blocks.push({ t: "h", text: s.title }, { t: "p", text: s.body });
      if (state.bankFile.checks.length) {
        blocks.push(
          { t: "h", text: "AI checks (TypeSafe), not official decisions" },
          { t: "list", items: state.bankFile.checks.map((c) => `${c.label}: ${c.verdict}`) },
        );
      }
      out.push({
        path: `${FOLDER.money}/bank-file-wio-business.pdf`,
        title: "Bank file",
        doc: { issuer: "Prepared by Atlas71 for Wio Business review", title: "Bank file", reference: bankFile.ref, issuedOn: fmtDateLong(bankFile.doneOn), blocks, footer },
      });
    }

    const bank = done("bank_account");
    if (bank?.doneOn) {
      const tail = bank.ref.replace(/\D/g, "").slice(-4);
      add(FOLDER.money, "wio-business-account", {
        issuer: "Wio Business",
        title: "Business account confirmation",
        reference: bank.ref,
        issuedOn: fmtDateLong(bank.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Account name", company],
              ["IBAN", `AE** **** **** **** ***${tail.slice(0, 1)} ${tail.slice(1)}`],
              ["Currency", "AED"],
              ["Opened on", fmtDateLong(bank.doneOn)],
              ["Authorised signatory", sig?.name ?? "On file"],
            ],
          },
        ],
      });
    }

    const pay = done("payments");
    if (pay?.doneOn) {
      add(FOLDER.money, "stripe-account", {
        issuer: "Stripe",
        title: "Payments account activation",
        reference: pay.ref,
        issuedOn: fmtDateLong(pay.doneOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Business", company],
              ["Country", "United Arab Emirates"],
              ["Activated on", fmtDateLong(pay.doneOn)],
              ["Payouts to", "The Wio Business account"],
            ],
          },
        ],
      });
    }

    const receipt = checkoutCard(state);
    if (receipt) {
      add(FOLDER.money, "atlas71-receipt", {
        issuer: "Atlas71 sandbox checkout",
        title: "Receipt",
        reference: receipt.receipt,
        issuedOn: fmtDateLong(receipt.paidOn),
        blocks: [
          {
            t: "kv",
            rows: [
              ["Paid by", `${receipt.payer.name}, ${company}`],
              ["For", receipt.description],
              ...receipt.lines.map((l) => [l.label, aed(l.amountAed)] as [string, string]),
              ["Total", aed(receipt.amountAed)],
              ["Method", `${receipt.method.brand} test card ending ${receipt.method.last4}; no card was charged`],
            ],
          },
          { t: "h", text: "Paying authorised Atlas71 to" },
          { t: "list", items: receipt.authorises },
        ],
      }, true);
    }
  }

  const docs = state.inputs.investorDocs ? investorDocsFor(state) : null;
  if (docs) {
    const uploaded = fmtDateLong(state.today);
    add(FOLDER.founder, "investor-safe-summary", {
      issuer: `Founder upload, simulated: ${company}`,
      title: "Post-money SAFE: summary",
      reference: docs.files[0],
      issuedOn: uploaded,
      blocks: [
        {
          t: "kv",
          rows: [
            ["Company", company],
            ["Investor", docs.investor],
            ["Amount", `USD ${docs.amountUsd.toLocaleString("en-US")}`],
            ["Instrument", docs.instrument],
            ["Stake", docs.stake],
          ],
        },
      ],
    }, true);
    add(FOLDER.founder, "cap-table", {
      issuer: `Founder upload, simulated: ${company}`,
      title: "Cap table",
      reference: docs.files[1],
      issuedOn: uploaded,
      blocks: [
        { t: "kv", rows: docs.capTable.map((c) => [c.holder, `${c.pct}%`] as [string, string]) },
        { t: "p", text: docs.ownership, muted: true },
      ],
    }, true);
  }
  return out;
}

/** The README: the landing pack summary, plus what's in the ZIP and what's still on its way. */
function readme(state: CaseState, docs: PackDocument[]): string {
  const lines = [buildMarkdownPack(state).trimEnd(), "", "## In this pack", ""];
  lines.push("- `README.md`: this summary", "- `case.json`: the full case, for import or audit");
  for (const d of docs) lines.push(`- \`${d.path}\`: ${d.title} (simulated)`);
  const pending = (buildPlan(state)?.groups ?? []).flatMap((g) => g.steps).filter((s) => s.status !== "done");
  if (pending.length) {
    lines.push("", "Still on its way (documents appear here once issued):", "");
    for (const s of pending) lines.push(`- ${s.title}${s.who ? ` (${s.who})` : ""}`);
  }
  return `${lines.join("\n")}\n`;
}

export function buildZipPack(state: CaseState): Uint8Array<ArrayBuffer> {
  const root = `atlas71-${slug(state.profile.company ?? "case")}-landing-pack`;
  const docs = packDocuments(state);
  const entries: ZipEntry[] = [
    { path: `${root}/README.md`, data: readme(state, docs) },
    { path: `${root}/case.json`, data: buildJsonPack(state) },
    ...docs.map((d) => ({ path: `${root}/${d.path}`, data: buildPdf(d.doc) })),
  ];
  return buildZip(entries, state.today);
}
