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
    // Abu Dhabi vs home base comparison (researched and opened 2 Oct 2026)
    source(
      "uae-ct-rates",
      "u.ae - Corporate tax",
      "https://u.ae/en/information-and-services/finance-and-investment/taxation/corporate-tax",
      "official",
      "CT 0% on taxable income up to AED 375,000; 9% above AED 375,000",
    ),
    source(
      "mof-ct",
      "UAE MoF - Corporate Tax",
      "https://mof.gov.ae/corporate-tax/",
      "official",
      "A Qualifying Free Zone Person can benefit from a 0% CT rate on its Qualifying Income",
    ),
    source(
      "pwc-uae-indiv",
      "PwC WWTS - UAE individual other taxes (reviewed 2026)",
      "https://taxsummaries.pwc.com/united-arab-emirates/individual/other-taxes",
      "secondary",
      "No personal income tax in the UAE; social security applies only to UAE/GCC nationals; DEWS (5.83%/8.33% of basic) is a DIFC (Dubai) scheme",
    ),
    source(
      "uae-vat",
      "u.ae - VAT",
      "https://u.ae/en/information-and-services/finance-and-investment/taxation/vat/valueaddedtaxvat",
      "official",
      "5% VAT from 1 Jan 2018; mandatory registration above AED 375,000 taxable supplies",
    ),
    source(
      "uae-expat-pension",
      "u.ae - Pension schemes for expatriate workers",
      "https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-working-in-the-uae/pension-schemes-for-expatriate-workers",
      "official",
      "No pension schemes for expatriate workers; they get end-of-service gratuity instead; GCC nationals covered by home-country schemes",
    ),
    source(
      "adgm-eao-faq",
      "ADGM Employment Affairs Office FAQs - ER 2024 (Feb 2025)",
      "https://assets.adgm.com/download/assets/ADGM+EAO+-+FAQs+-+ER+2024+(Feb+2025).pdf/eed10768edbe11ef9eaee2d468ad6a26",
      "official",
      "Gratuity 21 days' basic wage per year for first 5 yrs, 30 days thereafter, payable regardless of reason for termination; employer may offer a pension/savings scheme instead; ILOE not mandatory in ADGM; max 48 hrs per 7 days; employee records in English",
    ),
    source(
      "uae-work-visa",
      "u.ae - Residence visa for working in the UAE",
      "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/residence-visa-for-working-in-the-uae",
      "official",
      "Standard employment visa valid two years, renewable; employer applies",
    ),
    source(
      "uae-family-visa",
      "u.ae - Residence visa for families of employees",
      "https://u.ae/en/information-and-services/visa-and-emirates-id/Types-of-visas/Residence-visa/residence-visa-for-family-members",
      "official",
      "Sponsor family if salary >= AED 4,000 or AED 3,000 + accommodation; spouse, sons under 25, unmarried daughters",
    ),
    source(
      "uae-golden-visa",
      "u.ae - Golden visa",
      "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa",
      "official",
      "Lists entrepreneurs under a 5-year golden visa (proof of innovative project, project value, incubator letter); holders can sponsor spouse and children",
    ),
    source(
      "uae-private-hours",
      "u.ae - Working hours (private sector)",
      "https://u.ae/en/information-and-services/jobs/Sector-of-employment/employment-in-the-private-sector/working-hours",
      "official",
      "Private sector max 8 hrs/day or 48 hrs/week; 2 hrs shorter per day in Ramadan",
    ),
    source(
      "uae-fact-sheet",
      "u.ae - UAE fact sheet",
      "https://u.ae/en/about-the-uae/fact-sheet",
      "official",
      "Arabic is the official language; all road and shop signs in Arabic and English; most private companies close only Sundays, others Sat and Sun",
    ),
    source(
      "adgm-common-law",
      "ADGM Courts - English common law",
      "https://www.adgm.com/adgm-courts/english-common-law",
      "official",
      "English common law directly applicable via Application of English Law Regulations 2015; first in the Middle East to take this approach",
    ),
    source(
      "hub71-faqs",
      "Hub71 - FAQs",
      "https://www.hub71.com/faqs",
      "official",
      "Access Programme: AED 250k cash via SAFE + AED 250k in-kind (office, housing, health insurance, visas); top-up up to AED 250k; at least one founder must relocate; pre-seed to Series A",
    ),
    source(
      "mubadala-2025",
      "Mubadala - 2025 results (9 Apr 2026)",
      "https://www.mubadala.com/en/news/strong-performance-by-uae-portfolio-drives-mubadalas-growth-in-2025",
      "official",
      "Mubadala AUM AED 1.4tn (US$385bn); AED 143bn deployed in 2025",
    ),
    source(
      "mof-gcc",
      "UAE MoF - GCC economic integration",
      "https://mof.gov.ae/gcc-economic-integration/",
      "official",
      "GCC Free Trade Area 1983, Customs Union 2003, Gulf Common Market 2008",
    ),
    source(
      "bayut-reem",
      "MyBayut - Popular areas to rent in Al Reem Island (updated 29 Sep 2026)",
      "https://www.bayut.com/mybayut/top-areas-rent-al-reem-island/",
      "secondary",
      "Avg 2BR rent: Najmat AED 126k, Shams/City of Lights AED 127k, Marina Square AED 131k, Makers District AED 139k per year",
    ),
    source(
      "pf-reem-2br",
      "Property Finder - 2BR rentals Al Reem Island",
      "https://www.propertyfinder.ae/en/rent/abu-dhabi/2-bedroom-apartments-for-rent-al-reem-island.html",
      "secondary",
      "~1,000 2BR listings, most between AED 95k and 155k per year",
    ),
    source(
      "numbeo-abudhabi",
      "Numbeo - Abu Dhabi (updated 1 Oct 2026)",
      "https://www.numbeo.com/cost-of-living/in/Abu-Dhabi",
      "secondary",
      "International primary school avg AED 54,430/yr (range 30k-80k); 3BR city centre AED 14,243/month",
    ),
    source(
      "yalla-adek-outstanding",
      "Yalla Abu Dhabi - Outstanding ADEK schools 2025-26",
      "https://yallaabudhabi.ae/education/education-news/outstanding-schools-adek-abu-dhabi-2025-26/",
      "secondary",
      "13 Outstanding-rated schools charge AED 26,200-105,980/yr",
    ),
    source(
      "doh-law-23",
      "Abu Dhabi Law No. 23 of 2005 (Health Insurance) - DoH",
      "https://www.doh.gov.ae/-/media/0BE585B5E6814D81913697DD6E644C02.ashx",
      "official",
      "Art. 5: employer must insure employees plus wife and three children under 18; sponsor insures any other sponsored person; no residence permit without insurance",
    ),
    source(
      "pwc-india-cit",
      "PwC WWTS - India corporate income (reviewed 11 May 2026)",
      "https://taxsummaries.pwc.com/india/corporate/taxes-on-corporate-income",
      "secondary",
      "Concessional CIT 22% plus 10% surcharge plus 4% health & education cess (=25.168% effective, computed)",
    ),
    source(
      "pwc-india-pit",
      "PwC WWTS - India personal income (reviewed 12 May 2026)",
      "https://taxsummaries.pwc.com/india/individual/taxes-on-personal-income",
      "secondary",
      "New regime slabs 0-30%, 30% above INR 24 lakh; surcharge 10%/15%/25% above INR 50 lakh/1 cr/2 cr (capped at 25% in new regime); 4% cess",
    ),
    source(
      "pwc-india-other",
      "PwC WWTS - India corporate other taxes",
      "https://taxsummaries.pwc.com/india/corporate/other-taxes",
      "secondary",
      "GST general rate 18% for most supplies",
    ),
    source(
      "xflow-gst",
      "Xflow - GST on software services",
      "https://www.xflowpay.com/blog/gst-on-software-services",
      "secondary",
      "Software/IT services (SAC 9983) 18% GST domestically; 0% when exported under LUT",
    ),
    source(
      "pwc-india-indiv-other",
      "PwC WWTS - India individual other taxes",
      "https://taxsummaries.pwc.com/india/individual/other-taxes",
      "secondary",
      "Employer matches employee 12% PF; 8.33% of salary (capped at INR 15,000/month) goes to pension fund (EPS)",
    ),
    source(
      "karnataka-hours",
      "greytHR - Karnataka Shops Act work hours",
      "https://www.greythr.com/notifications/karnataka-government-limits-work-hours-under-the-shops-and-establishments-act/",
      "secondary",
      "Karnataka: max 9 hrs/day and 48 hrs/week; 10 hrs/day incl. overtime",
    ),
    source(
      "pib-startups",
      "PIB - Startup recognition FY2025-26 (17 Apr 2026)",
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2253019&reg=3&lang=2",
      "official",
      "2.23 lakh+ DPIIT-recognised startups as of 31 Mar 2026; 55,200+ recognised in FY2025-26",
    ),
    source(
      "numbeo-bangalore",
      "Numbeo - Bangalore (updated 28 Sep 2026)",
      "https://www.numbeo.com/cost-of-living/in/Bangalore",
      "secondary",
      "1BR centre INR 29,720/mo; 3BR centre INR 75,870/mo; international primary school avg INR 311,471/yr (range 150k-1m)",
    ),
    source(
      "nestriqo-blr",
      "NestRiqo - 2BHK rent in Bangalore 2026 (Jul 2026)",
      "https://www.nestriqo.com/blog/average-rent-2bhk-bangalore-2026",
      "secondary",
      "2BHK rent: Koramangala INR 35k-58k/mo, HSR Layout INR 28k-48k/mo (owner listings, June 2026)",
    ),
    source(
      "pwc-egypt-cit",
      "PwC WWTS - Egypt corporate income",
      "https://taxsummaries.pwc.com/egypt/corporate/taxes-on-corporate-income",
      "secondary",
      "Standard CIT 22.5% (oil exploration 40.55%; SCA/EGPC/CBE 40%)",
    ),
    source(
      "pwc-egypt-pit",
      "PwC WWTS - Egypt personal income (reviewed 17 Aug 2026)",
      "https://taxsummaries.pwc.com/egypt/individual/taxes-on-personal-income",
      "secondary",
      "Salary tax progressive 0-27.5%; 27.5% above EGP 1.2m; EGP 20,000 annual exemption",
    ),
    source(
      "pwc-egypt-other",
      "PwC WWTS - Egypt corporate other taxes (reviewed 17 Aug 2026)",
      "https://taxsummaries.pwc.com/egypt/corporate/other-taxes",
      "secondary",
      "Standard VAT 14%; exported services can be zero-rated; employer social insurance 18.75%; 0.25% of annual revenue to universal health insurance",
    ),
    source(
      "pwc-egypt-indiv-other",
      "PwC WWTS - Egypt individual other taxes",
      "https://taxsummaries.pwc.com/egypt/individual/other-taxes",
      "secondary",
      "Employer 18.75%, employee 11% of insurable salary; max insurable salary EGP 16,700/month in 2026",
    ),
    source(
      "egypt-weekend",
      "The National - Weekends in the Arab world",
      "https://www.thenationalnews.com/mena/2021/12/07/when-is-the-weekend-in-the-arab-world/",
      "secondary",
      "Egypt weekend is Friday-Saturday; some private firms take a Thursday half-day",
    ),
    source(
      "egypt-labour-hours",
      "Lexis Middle East - Egypt new labour law working hours (Mar 2026)",
      "https://www.lexismiddleeast.com/news/2026-03-26_45/en",
      "secondary",
      "Labour Law No. 14 of 2025: max 8 hrs/day or 48 hrs/week excluding breaks; max 10 hrs presence/day",
    ),
    source(
      "itida-outlook",
      "ITIDA - Egypt ICT sector outlook",
      "https://itida.gov.eg/English/Programs/Industry-Outlook/Pages/default.aspx",
      "official",
      "Digital exports US$4.8bn in 2025; 240+ offshoring companies, 270+ delivery centres; 'multilingual talent at a competitive cost'",
    ),
    source(
      "numbeo-cairo",
      "Numbeo - Cairo (updated 1 Oct 2026)",
      "https://www.numbeo.com/cost-of-living/in/Cairo-Egypt",
      "secondary",
      "1BR centre EGP 11,357/mo (8k-15k); 3BR centre EGP 27,400/mo (15k-60k)",
    ),
    source(
      "fx-er-api",
      "ExchangeRate-API open feed (AED base)",
      "https://open.er-api.com/v6/latest/AED",
      "secondary",
      "1 AED = 26.2346 INR, 14.2349 EGP (updated 2 Oct 2026 00:02 UTC)",
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
