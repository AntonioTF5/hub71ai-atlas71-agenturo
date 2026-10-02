// Abu Dhabi and the demo founders' home bases, for the "does Abu Dhabi fit?" comparison.
// Short, sourced claims (source ids live in kb.ts), researched and opened on 2 Oct 2026.
// Living costs are listing averages converted at INR 26.23 and EGP 14.23 per AED (2 Oct 2026): estimates.
import type { CompareRow } from "./types";

export interface Cell {
  text: string;
  sources: string[];
}

export type CellKey =
  | "corporateTax"
  | "personalTax"
  | "vat"
  | "socialSecurity"
  | "ecosystem"
  | "market"
  | "residency"
  | "longTermVisa"
  | "workWeek"
  | "languageLaw"
  | "costOfLiving";

export interface HomeBase {
  id: string;
  name: string;
  match: RegExp;
  cells: Record<CellKey, Cell>;
  rentFamilyAed: [number, number]; // 2-bed, 12 months
  rentSingleAed: [number, number]; // 1-bed, 12 months
  schoolAed: [number, number] | null; // international school, per child per year
  socialSecurityEdge: CompareRow["edge"];
  lawEdge: CompareRow["edge"];
  costSources: string[];
}

export const UAE: Record<CellKey, Cell> & {
  rentFamilyAed: [number, number];
  rentSingleAed: [number, number];
  schoolAed: [number, number];
  costSources: string[];
} = {
  corporateTax: {
    text: "0% on profit up to AED 375k, 9% above; 0% only on qualifying free-zone income",
    sources: ["uae-ct-rates", "mof-ct"],
  },
  personalTax: { text: "No personal income tax on salaries", sources: ["pwc-uae-indiv"] },
  vat: { text: "5% VAT", sources: ["uae-vat"] },
  socialSecurity: {
    text: "None for non-GCC staff; an end-of-service gratuity instead (21 days' basic pay a year)",
    sources: ["uae-expat-pension", "adgm-eao-faq"],
  },
  ecosystem: {
    text: "Hub71 Access: AED 250k via SAFE + AED 250k in kind (selective); Mubadala alone manages AED 1.4tn",
    sources: ["hub71-faqs", "mubadala-2025"],
  },
  market: { text: "Inside the GCC common market; mainland sales may need a dual licence", sources: ["mof-gcc", "adra-dual"] },
  residency: {
    text: "2-year visa through your company; sponsor your spouse and children",
    sources: ["uae-work-visa", "uae-family-visa"],
  },
  longTermVisa: {
    text: "Golden visa for incubator-backed founders: 5 to 10 years (official pages differ)",
    sources: ["golden-visa", "uae-golden-visa"],
  },
  workWeek: {
    text: "Employer sets the weekend; most firms work Monday to Friday; 48-hour cap",
    sources: ["uae-private-hours", "uae-fact-sheet"],
  },
  languageLaw: {
    text: "Arabic official, English in business; ADGM courts apply English common law",
    sources: ["uae-fact-sheet", "adgm-common-law"],
  },
  costOfLiving: { text: "Higher: a 2-bed on Al Reem is AED 95k–155k a year", sources: ["bayut-reem", "pf-reem-2br"] },
  rentFamilyAed: [95_000, 155_000],
  rentSingleAed: [60_000, 90_000], // estimate: no verified 1-bed range, below Al Reem 2-bed listings
  schoolAed: [30_000, 80_000],
  costSources: ["bayut-reem", "pf-reem-2br", "numbeo-abudhabi", "yalla-adek-outstanding", "doh-law-23"],
};

export const HOME_BASES: HomeBase[] = [
  {
    id: "india",
    name: "India",
    match: /india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|gurgaon|gurugram|noida/i,
    cells: {
      corporateTax: { text: "About 25.2% (22% + surcharge + cess)", sources: ["pwc-india-cit"] },
      personalTax: { text: "Up to about 39% (30% top slab + surcharge + cess)", sources: ["pwc-india-pit"] },
      vat: { text: "18% GST on software services", sources: ["pwc-india-other", "xflow-gst"] },
      socialSecurity: { text: "Employer pays 12% of basic pay to EPF", sources: ["pwc-india-indiv-other"] },
      ecosystem: { text: "Deep home ecosystem: 2.23 lakh+ recognised startups", sources: ["pib-startups"] },
      market: { text: "Huge home market; Gulf sales handled from abroad", sources: ["pib-startups"] },
      residency: { text: "Home country: no visas", sources: [] },
      longTermVisa: { text: "Not needed", sources: [] },
      workWeek: { text: "Tech firms mostly Monday to Friday; 48-hour cap in Karnataka", sources: ["karnataka-hours"] },
      languageLaw: { text: "English in business; common-law courts", sources: [] },
      costOfLiving: { text: "Lower: a 2BHK in Koramangala or HSR is about AED 16k–27k a year", sources: ["nestriqo-blr", "numbeo-bangalore"] },
    },
    rentFamilyAed: [16_000, 27_500],
    rentSingleAed: [9_000, 16_000],
    schoolAed: [11_400, 32_400],
    socialSecurityEdge: "abu_dhabi",
    lawEdge: "even",
    costSources: ["nestriqo-blr", "numbeo-bangalore", "fx-er-api"],
  },
  {
    id: "egypt",
    name: "Egypt",
    match: /egypt|cairo|giza|alexandria/i,
    cells: {
      corporateTax: { text: "22.5%", sources: ["pwc-egypt-cit"] },
      personalTax: { text: "Up to 27.5%", sources: ["pwc-egypt-pit"] },
      vat: { text: "14% VAT", sources: ["pwc-egypt-other"] },
      socialSecurity: { text: "Employer pays 18.75% social insurance", sources: ["pwc-egypt-indiv-other"] },
      ecosystem: { text: "Cost-competitive talent; US$4.8bn digital exports in 2025", sources: ["itida-outlook"] },
      market: { text: "Large home market; Gulf clients served from Cairo", sources: [] },
      residency: { text: "Home country: no visas", sources: [] },
      longTermVisa: { text: "Not needed", sources: [] },
      workWeek: { text: "Sunday to Thursday; Friday–Saturday weekend; 48-hour cap", sources: ["egypt-weekend", "egypt-labour-hours"] },
      languageLaw: { text: "Arabic; civil-law courts", sources: [] },
      costOfLiving: { text: "Much lower: central Cairo 1–2 bed is about AED 7k–25k a year", sources: ["numbeo-cairo"] },
    },
    rentFamilyAed: [12_600, 33_700],
    rentSingleAed: [6_700, 25_300],
    schoolAed: null,
    socialSecurityEdge: "abu_dhabi",
    lawEdge: "abu_dhabi",
    costSources: ["numbeo-cairo", "fx-er-api"],
  },
];
