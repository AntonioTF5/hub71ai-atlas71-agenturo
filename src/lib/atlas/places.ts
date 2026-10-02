// Abu Dhabi and the demo founders' home bases, for the "does Abu Dhabi fit?" comparison.
// Short, sourced claims (source ids live in kb.ts); living costs are estimates and labelled as such.
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
  corporateTax: { text: "0% up to AED 375k profit, 9% above; 0% on qualifying free-zone income", sources: ["uae-ct"] },
  personalTax: { text: "None on salaries", sources: ["uae-pit"] },
  vat: { text: "5% VAT", sources: ["uae-vat"] },
  socialSecurity: { text: "None for non-GCC staff; end-of-service gratuity instead", sources: ["uae-gratuity"] },
  ecosystem: { text: "Hub71: AED 250k in kind + AED 250k via SAFE (selective); Gulf sovereign and VC funds", sources: ["hub71-access"] },
  market: { text: "GCC customers on your doorstep; one licence covers the UAE free zone", sources: ["adra-dual"] },
  residency: { text: "2-year visa through your company; you sponsor your spouse and children", sources: ["adgm-gs-fees"] },
  longTermVisa: { text: "Golden visa for incubator-endorsed founders (5 or 10 years; confirm)", sources: ["golden-visa"] },
  workWeek: { text: "Monday to Friday", sources: ["uae-workweek"] },
  languageLaw: { text: "English in business; ADGM courts apply English common law", sources: ["adgm-tsl"] },
  costOfLiving: { text: "Higher: rent and school fees are the big items", sources: ["ad-rent", "ad-school"] },
  rentFamilyAed: [90_000, 140_000],
  rentSingleAed: [60_000, 85_000],
  schoolAed: [45_000, 95_000],
  costSources: ["ad-rent", "ad-school"],
};

export const HOME_BASES: HomeBase[] = [
  {
    id: "india",
    name: "India",
    match: /india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|gurgaon|gurugram|noida/i,
    cells: {
      corporateTax: { text: "About 25% (22% + surcharge + cess)", sources: ["in-ct"] },
      personalTax: { text: "Up to 30% + surcharge and cess (about 39% at the top)", sources: ["in-pit"] },
      vat: { text: "18% GST on software services", sources: ["in-gst"] },
      socialSecurity: { text: "Employer pays 12% of basic pay to EPF", sources: ["in-epf"] },
      ecosystem: { text: "Deep local VC market, Bangalore's startup scene", sources: [] },
      market: { text: "Large home market; Gulf sales from abroad", sources: [] },
      residency: { text: "Citizens: no visas needed", sources: [] },
      longTermVisa: { text: "Not needed", sources: [] },
      workWeek: { text: "Monday to Friday, some Saturdays", sources: [] },
      languageLaw: { text: "English in business; Indian common law courts", sources: [] },
      costOfLiving: { text: "Lower: a fraction of Abu Dhabi rents and fees", sources: ["in-rent"] },
    },
    rentFamilyAed: [23_000, 41_000],
    rentSingleAed: [12_000, 21_000],
    schoolAed: [13_000, 43_000],
    socialSecurityEdge: "abu_dhabi",
    lawEdge: "even",
    costSources: ["in-rent"],
  },
  {
    id: "egypt",
    name: "Egypt",
    match: /egypt|cairo|giza|alexandria/i,
    cells: {
      corporateTax: { text: "22.5%", sources: ["eg-tax"] },
      personalTax: { text: "Up to 27.5%", sources: ["eg-tax"] },
      vat: { text: "14% VAT", sources: ["eg-tax"] },
      socialSecurity: { text: "Employer pays 18.75% social insurance", sources: ["eg-tax"] },
      ecosystem: { text: "Growing VC scene, smaller rounds", sources: [] },
      market: { text: "Large home market; Gulf clients served from abroad", sources: [] },
      residency: { text: "Citizens: no visas needed", sources: [] },
      longTermVisa: { text: "Not needed", sources: [] },
      workWeek: { text: "Sunday to Thursday", sources: [] },
      languageLaw: { text: "Arabic in law; civil-law courts", sources: [] },
      costOfLiving: { text: "Much lower: rent and salaries cost far less", sources: ["eg-rent"] },
    },
    rentFamilyAed: [15_000, 40_000],
    rentSingleAed: [9_000, 25_000],
    schoolAed: [15_000, 60_000],
    socialSecurityEdge: "abu_dhabi",
    lawEdge: "abu_dhabi",
    costSources: ["eg-rent"],
  },
];
