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
  rentFamilyAed: [number, number]; // 2-bed (Egypt: 3-bed, the only family size sourced), 12 months
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
    text: "0% on profit up to AED 375k, 9% above; Small Business Relief can make revenue up to AED 3m tax-free through 2029",
    sources: ["uae-ct-rates", "uae-sbr"],
  },
  personalTax: { text: "No personal income tax on salaries", sources: ["uae-personal-tax"] },
  vat: { text: "5% VAT; services exported to non-GCC clients abroad are zero-rated", sources: ["uae-vat", "uae-vat-reg"] },
  socialSecurity: {
    text: "None for non-GCC staff; an end-of-service gratuity instead (21 days' basic pay a year)",
    sources: ["uae-expat-pension", "adgm-eao-faq"],
  },
  ecosystem: {
    text: "Hub71 Access: AED 250k via SAFE + AED 250k in kind; about 1.1% of Cohort 18 applicants got in; Mubadala alone manages AED 1.4tn",
    sources: ["hub71-faqs", "hub71-cohort18", "mubadala-2025"],
  },
  market: { text: "Near Gulf clients; onshore Abu Dhabi work may need a dual licence; GCC common-market rights belong to GCC citizens", sources: ["mof-gcc", "adra-dual"] },
  residency: {
    text: "Renewable 2-year visa through your company; sponsor spouse and children from AED 4,000 a month (or 3,000 with housing)",
    sources: ["uae-work-visa", "uae-family-visa"],
  },
  longTermVisa: {
    text: "Golden visa for incubator-nominated founders: 10 years per ICP and ADDED (u.ae still lists 5)",
    sources: ["golden-visa", "uae-golden-visa"],
  },
  workWeek: {
    text: "Most private firms close only on Sundays, others also Saturdays; 48-hour week cap",
    sources: ["uae-private-hours", "uae-fact-sheet"],
  },
  languageLaw: {
    text: "Arabic official, English in business; ADGM courts apply English common law",
    sources: ["uae-fact-sheet", "adgm-common-law"],
  },
  costOfLiving: { text: "Higher: a 2-bed on Al Reem averages about AED 119k–139k a year", sources: ["bayut-reem", "pf-reem-2br"] },
  rentFamilyAed: [119_000, 139_000], // Property Finder typical 2BR 119k-130k; MyBayut Al Reem 2BR averages 126k-139k
  rentSingleAed: [87_000, 98_000], // Numbeo 1BR centre avg 86.7k; MyBayut Al Reem 1BR averages 91k-98k
  schoolAed: [30_000, 80_000],
  costSources: ["bayut-reem", "pf-reem-2br", "numbeo-abudhabi", "yalla-adek-outstanding", "doh-law-23"],
};

export const HOME_BASES: HomeBase[] = [
  {
    id: "india",
    name: "India",
    match: /india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai|gurgaon|gurugram|noida/i,
    cells: {
      corporateTax: { text: "About 25.2% (22% regime); IMB-certified startups can take a 3-year profit holiday instead", sources: ["pwc-india-cit", "india-startup-holiday"] },
      personalTax: { text: "New regime: 30% above ₹24 lakh, about 39% with surcharge and cess above ₹2 crore; residents are taxed on worldwide income", sources: ["pwc-india-pit"] },
      vat: { text: "18% GST on software services; exports zero-rated under a bond or LUT", sources: ["pwc-india-other", "xflow-gst"] },
      socialSecurity: { text: "Employer 12% to EPF at firms with 20+ staff, compulsory on wages up to ₹25,000 a month (ceiling raised Sep 2026)", sources: ["pwc-india-indiv-other", "pib-epf-ceiling"] },
      ecosystem: { text: "2.23 lakh+ DPIIT-recognised startups (31 Mar 2026)", sources: ["pib-startups"] },
      market: { text: "Home market plus Gulf customers served from abroad", sources: [] },
      residency: { text: "Home country: no visas", sources: [] },
      longTermVisa: { text: "Not needed", sources: [] },
      workWeek: { text: "48-hour week cap in Karnataka (9 hours a day)", sources: ["karnataka-hours"] },
      languageLaw: { text: "English in business; common-law courts", sources: [] },
      costOfLiving: { text: "Lower: a 2BHK in Koramangala or HSR is about AED 13k–27k a year", sources: ["nestriqo-blr", "numbeo-bangalore"] },
    },
    rentFamilyAed: [12_800, 26_500], // NestRiqo: HSR 28k-48k, Koramangala 35k-58k INR a month
    rentSingleAed: [9_100, 18_300], // Numbeo 1BR centre range
    schoolAed: [5_700, 38_100], // Numbeo international primary school range (avg 11.9k)
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
      personalTax: { text: "Up to 27.5%, on taxable income above EGP 1.2m a year", sources: ["pwc-egypt-pit"] },
      vat: { text: "14% VAT; exported services zero-rated", sources: ["pwc-egypt-other"] },
      socialSecurity: { text: "Employer 18.75% of insured pay, capped at EGP 16,700 a month in 2026 (about EGP 3,130 at most)", sources: ["pwc-egypt-indiv-other"] },
      ecosystem: { text: "Cost-competitive talent; US$4.8bn digital exports in 2025", sources: ["itida-outlook"] },
      market: { text: "Large home market; Gulf clients served from Cairo", sources: [] },
      residency: { text: "Home country: no visas", sources: [] },
      longTermVisa: { text: "Not needed", sources: [] },
      workWeek: { text: "Sunday to Thursday; Friday–Saturday weekend; 48-hour cap", sources: ["egypt-weekend", "egypt-labour-hours"] },
      languageLaw: { text: "Arabic; civil-law courts", sources: [] },
      costOfLiving: { text: "Much lower: a central Cairo 1-bed is about AED 6.7k–12.6k a year, a 3-bed 12.6k–50.6k", sources: ["numbeo-cairo"] },
    },
    rentFamilyAed: [12_600, 50_600], // Numbeo has no 2-bed category: the 3-bed centre range
    rentSingleAed: [6_700, 12_600],
    schoolAed: null,
    socialSecurityEdge: "abu_dhabi",
    lawEdge: "abu_dhabi",
    costSources: ["numbeo-cairo", "fx-er-api"],
  },
];
