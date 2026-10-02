// Knowledge base: sources, routes, steps and fees. Pure data, shared by the server and the client.
// Every source was checked on 2026-10-02. Fees are AED at cost, converted at USD 1 = AED 3.6725.
import type { RouteId, SourceRef, StepGroup, StepId } from "./types";

export const FX_USD_AED = 3.6725;
export const KB_CHECKED_ON = "2026-10-02";

export type SourceStatus = "official" | "secondary" | "assumption";
export interface Source extends SourceRef {
  claim: string;
  status: SourceStatus;
}

const source = (id: string, title: string, url: string, status: SourceStatus, claim: string): Source => ({
  id,
  title,
  url,
  status,
  claim,
});

export const SOURCES: Record<string, Source> = Object.fromEntries(
  [
    source(
      "adgm-tsl",
      "ADGM · Tech Startup Licence",
      "https://www.adgm.com/business-areas/tech-startup",
      "official",
      "The Tech Startup Licence needs a Hub71 eligibility letter (since Jul 2024). It isn't for technology service providers. 3 visas per dedicated desk. Incentivised for up to 3 years.",
    ),
    source(
      "adgm-fees",
      "ADGM · Schedule of fees 2025",
      "https://assets.adgm.com/download/assets/Schedule+of+Fees+2025.pdf/6f25a452823d11ef808c3e0446867bce",
      "official",
      "Tech Startup Licence $1,500 + $300 data protection. Standard non-financial licence $5,800 in year one, $5,300 renewal.",
    ),
    source(
      "adgm-gs-fees",
      "ADGM Government Services · Fee schedule",
      "https://assets.adgm.com/download/assets/GS+Fee+Schedule+19.11.2024.pdf/0924d554643511efb4ba6646cc95a6ef",
      "official",
      "Establishment card AED 1,127.27. e-Channels AED 4,197.27. 2-year employment visa from abroad AED 3,237.39. Dependant visa AED 2,607.39 (18+) / 2,094.89 (under 18).",
    ),
    source(
      "adgm-faq",
      "ADGM · Setting up FAQ",
      "https://www.adgm.com/faqs/setting-up",
      "official",
      "Incorporation within 10 business days of a complete file. A dedicated desk is required; hot desks don't count.",
    ),
    source(
      "hub71-tsl",
      "Hub71 · FAQs",
      "https://www.hub71.com/faqs",
      "official",
      "The Hub71 eligibility letter is separate from the selective Access programme.",
    ),
    source(
      "hub71-access",
      "Hub71 · Access programme",
      "https://www.hub71.com/program/access-programme",
      "official",
      "Access programme: AED 250k in kind + AED 250k via SAFE. Selective (52 of 5,000+ admitted in 2025).",
    ),
    source(
      "masdar",
      "Masdar City Free Zone · Licences",
      "https://masdarcityfreezone.com/explore/license-and-registration",
      "official",
      "Innovation package AED 12,000 + 5% VAT, flexi desk, 2-visa quota. UAE civil law.",
    ),
    source(
      "adra-dual",
      "ADRA · Dual licence",
      "https://www.adra.gov.ae/en/establishing/dual-licence",
      "official",
      "A dual licence (AED 1,200) lets a free-zone company operate on the mainland. Activity-specific.",
    ),
    source(
      "fta-ct",
      "FTA · Corporate tax registration timeframes",
      "https://tax.gov.ae/en/media.centre/news/federal.tax.authority.issues.new.decision.on.specified.timeframes.for.corporate.tax.registration.aspx",
      "official",
      "New companies register for corporate tax within 3 months of incorporation.",
    ),
    source(
      "mof-penalty",
      "UAE Ministry of Finance · Late registration penalty",
      "https://mof.gov.ae/en/news/aed10000-penalty-for-late-corporate-tax-registration/",
      "official",
      "AED 10,000 penalty for late corporate tax registration.",
    ),
    source(
      "icp-eid",
      "ICP · Emirates ID issuance",
      "https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a",
      "official",
      "Emirates ID issuance takes about 5 working days.",
    ),
    source(
      "wio",
      "Wio Business",
      "https://www.wio.io/business",
      "secondary",
      "Wio Business is \"up and running in 3 working days\". Plans from AED 99/month. The signatory needs an Emirates ID.",
    ),
    source(
      "stripe-uae",
      "Stripe · UAE activation requirements",
      "https://support.stripe.com/questions/uae-account-activation-requirements",
      "secondary",
      "Stripe UAE needs a trade licence and a bank statement.",
    ),
    source(
      "desk-price",
      "Aegis Coworking · ADGM dedicated desk",
      "https://www.aegiscoworking.ae/blog/adgm-tech-startup-licence-dedicated-desk",
      "secondary",
      "An ADGM-compliant dedicated desk costs about AED 13,800/year.",
    ),
    source(
      "golden-visa",
      "ADDED · Golden visa for entrepreneurs",
      "https://www.added.gov.ae/en/live/long-term-residency/abu-dhabi-golden-visa/for-entrepreneurs",
      "official",
      "Incubator-endorsed founders can get a long-term visa. ADDED says 10 years, while ADGM's page says 5: confirm before relying on it.",
    ),
    source(
      "apostille",
      "HCCH · Apostille Convention status",
      "https://www.hcch.net/en/instruments/conventions/status-table/?cid=41",
      "official",
      "The UAE isn't party to the Apostille Convention, so family documents need legalisation. Start early.",
    ),
    source(
      "atlas-pricing",
      "Atlas71 pricing hypothesis",
      "",
      "assumption",
      "Atlas71 fee AED 4,900 flat per company landing. A pricing hypothesis, not a published price.",
    ),
    source(
      "seha-medical",
      "Policybazaar · Medical fitness test",
      "https://www.policybazaar.ae/health-insurance/articles/medical-fitness-test-in-abu-dhabi/",
      "secondary",
      "A residency medical fitness test costs about AED 250–350.",
    ),
  ].map((s) => [s.id, s]),
);

export function sourceRefs(ids: string[]): SourceRef[] {
  return [...new Set(ids)]
    .map((id) => SOURCES[id])
    .filter(Boolean)
    .map(({ id, title, url }) => ({ id, title, url }));
}

// ---------- Fees (AED, at cost) ----------
export const FEES = {
  atlas: 4900, // atlas-pricing
  establishmentCard: 5325, // 1,127.27 establishment card + 4,197.27 e-Channels
  visa: 3237, // 2-year employment visa from abroad
  medical: 300,
  emiratesId: 300,
  dependantVisaAdult: 2607,
  dependantVisaChild: 2095,
  dependantExtrasAdult: 600, // medical + Emirates ID
  dependantExtrasChild: 300,
  desk: 13800, // per dedicated desk per year
  dualLicence: 1200,
  bankPlanMonthly: 99,
  latePenalty: 10000,
} as const;

// ---------- Routes ----------
export interface RouteInfo {
  id: RouteId;
  name: string;
  summary: string;
  licenceAed: number;
  licenceLabel: string;
  law: string;
  deskAed: number | null; // per dedicated desk per year; null means a flexi desk is included
  visasPerDesk: number | null;
  includedVisas: number | null;
  fullyPriced: boolean; // Masdar's visa and establishment-card fees aren't verified
  sources: string[];
}

export const ROUTES: Record<RouteId, RouteInfo> = {
  adgm_tsl: {
    id: "adgm_tsl",
    name: "ADGM Tech Startup Licence",
    summary:
      "ADGM's licence for tech startups, under English common law. It's incentivised for up to 3 years, needs a Hub71 eligibility letter, and gives 3 visas per dedicated desk.",
    licenceAed: 6611,
    licenceLabel: "ADGM Tech Startup Licence, year one ($1,500 + $300 data protection)",
    law: "English common law",
    deskAed: FEES.desk,
    visasPerDesk: 3,
    includedVisas: null,
    fullyPriced: true,
    sources: ["adgm-tsl", "adgm-fees", "hub71-tsl"],
  },
  adgm_standard: {
    id: "adgm_standard",
    name: "ADGM licence (non-financial)",
    summary:
      "A standard ADGM non-financial licence, under English common law. Any lawful non-financial activity, including technology services, with 3 visas per dedicated desk.",
    licenceAed: 21301,
    licenceLabel: "ADGM non-financial licence, year one ($5,800; $5,300 renewal)",
    law: "English common law",
    deskAed: FEES.desk,
    visasPerDesk: 3, // assumption: the same desk rule as the startup licence
    includedVisas: null,
    fullyPriced: true,
    sources: ["adgm-fees", "adgm-faq"],
  },
  masdar: {
    id: "masdar",
    name: "Masdar City Free Zone · Innovation",
    summary:
      "Masdar City's innovation package: a flexi desk and a 2-visa quota under UAE civil law. More visas need a bigger package, quoted by the free zone.",
    licenceAed: 12600,
    licenceLabel: "Masdar Innovation package (AED 12,000 + 5% VAT, flexi desk, 2 visas)",
    law: "UAE civil law",
    deskAed: null,
    visasPerDesk: null,
    includedVisas: 2,
    fullyPriced: false,
    sources: ["masdar"],
  },
};

// ---------- Steps ----------
export type StepScope = "company" | "person" | "dependant";
export type StepInput = "medical_slot" | "documents" | "bank_facts";

export interface StepInfo {
  id: StepId;
  title: string;
  group: StepGroup;
  scope: StepScope;
  provider: string;
  masdarProvider?: string;
  days: [number, number]; // [best, typical] calendar days
  sim: number; // the deterministic duration the simulator uses
  input?: StepInput;
  note?: string;
  sources: string[];
}

export const STEPS: Record<StepId, StepInfo> = {
  hub71_letter: {
    id: "hub71_letter",
    title: "Hub71 eligibility letter",
    group: "Company",
    scope: "company",
    provider: "Hub71",
    days: [14, 28],
    sim: 14,
    note: "Separate from the selective Access programme.",
    sources: ["adgm-tsl", "hub71-tsl"],
  },
  desk: {
    id: "desk",
    title: "Dedicated desk lease",
    group: "Company",
    scope: "company",
    provider: "ADGM-zone coworking",
    days: [1, 7],
    sim: 2,
    note: "ADGM needs a dedicated desk; hot desks don't count.",
    sources: ["adgm-faq", "desk-price"],
  },
  incorporation: {
    id: "incorporation",
    title: "Incorporation + commercial licence",
    group: "Company",
    scope: "company",
    provider: "ADGM Registration Authority",
    masdarProvider: "Masdar City Free Zone",
    days: [5, 14],
    sim: 7,
    sources: ["adgm-faq", "adgm-fees"],
  },
  establishment_card: {
    id: "establishment_card",
    title: "Establishment card + e-Channels",
    group: "Company",
    scope: "company",
    provider: "ADGM Government Services",
    masdarProvider: "Masdar City Free Zone",
    days: [5, 14],
    sim: 5,
    sources: ["adgm-gs-fees"],
  },
  tax_registration: {
    id: "tax_registration",
    title: "Corporate tax registration",
    group: "Money & tax",
    scope: "company",
    provider: "FTA · EmaraTax",
    days: [3, 20],
    sim: 5,
    note: "Due within 3 months of incorporation; AED 10,000 penalty if late.",
    sources: ["fta-ct", "mof-penalty"],
  },
  entry_permit: {
    id: "entry_permit",
    title: "Entry permit + work permit",
    group: "People",
    scope: "person",
    provider: "ADGM GS → ICP",
    masdarProvider: "Masdar City FZ → ICP",
    days: [2, 7],
    sim: 2, // spec says 3; 2 (still inside the range) makes two "+2 weeks" land on the medical slot in the demo
    sources: ["adgm-gs-fees"],
  },
  medical: {
    id: "medical",
    title: "Medical fitness test",
    group: "People",
    scope: "person",
    provider: "SEHA",
    days: [1, 3],
    sim: 2,
    input: "medical_slot",
    sources: ["seha-medical"],
  },
  emirates_id: {
    id: "emirates_id",
    title: "Biometrics, Emirates ID + residence visa",
    group: "People",
    scope: "person",
    provider: "ICP",
    days: [3, 10],
    sim: 5,
    sources: ["icp-eid"],
  },
  dependant_visa: {
    id: "dependant_visa",
    title: "Dependant residence visa",
    group: "People",
    scope: "dependant",
    provider: "ICP",
    days: [7, 21],
    sim: 10,
    input: "documents",
    note: "Needs a legalised marriage or birth certificate. The UAE isn't in the Apostille Convention, so start early.",
    sources: ["adgm-gs-fees", "apostille"],
  },
  bank_file: {
    id: "bank_file",
    title: "Bank file prepared",
    group: "Money & tax",
    scope: "company",
    provider: "Atlas71",
    days: [0, 2],
    sim: 0,
    input: "bank_facts",
    note: "Atlas71 drafts it from facts you confirm.",
    sources: [],
  },
  bank_account: {
    id: "bank_account",
    title: "Business bank account",
    group: "Money & tax",
    scope: "company",
    provider: "Wio Business",
    days: [3, 15],
    sim: 4,
    note: "The signatory needs an Emirates ID. Plan from AED 99/month, billed by the bank.",
    sources: ["wio"],
  },
  payments: {
    id: "payments",
    title: "Payments live",
    group: "Money & tax",
    scope: "company",
    provider: "Stripe",
    days: [1, 3],
    sim: 2,
    note: "Stripe UAE needs the trade licence and a bank statement.",
    sources: ["stripe-uae"],
  },
};

export const STEP_ORDER: StepId[] = [
  "hub71_letter",
  "desk",
  "incorporation",
  "establishment_card",
  "tax_registration",
  "entry_permit",
  "medical",
  "emirates_id",
  "dependant_visa",
  "bank_file",
  "bank_account",
  "payments",
];

export const GROUPS: { label: StepGroup; steps: StepId[] }[] = [
  { label: "Company", steps: ["hub71_letter", "desk", "incorporation", "establishment_card"] },
  { label: "People", steps: ["entry_permit", "medical", "emirates_id", "dependant_visa"] },
  { label: "Money & tax", steps: ["tax_registration", "bank_file", "bank_account", "payments"] },
];

export const INCLUDED = [
  "Every filing and booking",
  "Document drafting",
  "The bank file",
  "12 months of deadline tracking",
  "Price locked at payment",
];

export const EXCLUDED = [
  "Health insurance (required for residence visas; quoted by the insurer)",
  "Housing and school fees",
  "Legalisation of home-country documents",
  "Bookkeeping and audit",
  "The bank plan (from AED 99/month)",
  "VAT on Atlas71's fee",
];
