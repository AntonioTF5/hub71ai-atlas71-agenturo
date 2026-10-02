// "Does Abu Dhabi fit your business and life?": Abu Dhabi against the founder's home base on taxes,
// opportunities, residency, working conditions and first-year costs. Pure: the tool adds TypeSafe judgments.
import type { CaseState, ChecksMeta, CompareCardData, CompareRow, Judgment } from "./types";
import { HOME_BASES, UAE, type HomeBase } from "./places.ts";
import { sourceRefs } from "./kb.ts";
import { isRoute, quote, relocating } from "./engine.ts";

export function findHomeBase(homeBase: string | null): HomeBase | null {
  if (!homeBase) return null;
  return HOME_BASES.find((h) => h.match.test(homeBase)) ?? null;
}

/** "Bangalore, India" → "Bangalore". */
export function homeLabel(homeBase: string | null, home: HomeBase | null): string {
  const first = homeBase?.split(",")[0]?.trim();
  return first || home?.name || "home";
}

const yes = (checks: Judgment[], key: string) => (checks.find((c) => c.key === key)?.p ?? 0) >= 0.65;

function range(lo: number, hi: number): [number, number] {
  return [Math.round(lo / 100) * 100, Math.round(hi / 100) * 100];
}

export function compareCard(state: CaseState, checks: Judgment[], meta: ChecksMeta): CompareCardData {
  const p = state.profile;
  const home = findHomeBase(p.homeBase);
  const label = homeLabel(p.homeBase, home);
  const movers = relocating(p).length || 1;
  const kids = p.dependants.filter((d) => d.relation === "child").length;
  const family = p.dependants.length > 0;
  const gcc = yes(checks, "gcc_customers");
  const raising = yes(checks, "raising_capital");
  const hiring = yes(checks, "hiring_abroad") || movers > 1;
  const costSensitive = yes(checks, "cost_sensitive");
  const unknown = "Not in Atlas71's data yet";
  const cell = (k: keyof HomeBase["cells"]) => home?.cells[k] ?? { text: unknown, sources: [] };

  const row = (
    topic: CompareRow["topic"],
    labelText: string,
    key: keyof HomeBase["cells"],
    edge: CompareRow["edge"],
    matters?: boolean,
  ): CompareRow => ({
    topic,
    label: labelText,
    abuDhabi: UAE[key].text,
    home: cell(key).text,
    edge: home ? edge : "even",
    matters: matters || undefined,
    sourceIds: [...new Set([...UAE[key].sources, ...cell(key).sources])],
  });

  const rows: CompareRow[] = [
    row("taxes", "Corporate tax", "corporateTax", "abu_dhabi"),
    row("taxes", "Personal income tax", "personalTax", "abu_dhabi", true),
    row("taxes", "VAT / GST on your sales", "vat", "abu_dhabi", gcc),
    row("taxes", "Employer social security", "socialSecurity", home?.socialSecurityEdge ?? "even", hiring),
    row("opportunities", "Funding and ecosystem", "ecosystem", "abu_dhabi", raising),
    row("opportunities", "Market access", "market", gcc ? "abu_dhabi" : "even", gcc),
    row("residency", "Residency", "residency", "home", family || hiring),
    row("residency", "Long-term visa", "longTermVisa", "abu_dhabi"),
    row("work", "Work week", "workWeek", "even", hiring),
    row("work", "Business language and law", "languageLaw", home?.lawEdge ?? "even"),
    row("costs", "Cost of living", "costOfLiving", "home", costSensitive || family),
  ];

  // First-year costs: the one-off landing (both ADGM routes until one is picked) plus housing and school.
  const routeTotal = isRoute(state.route) ? quote(state)?.totalAed : undefined;
  const tsl = quote(state, "adgm_tsl")?.totalAed ?? 0;
  const standard = quote(state, "adgm_standard")?.totalAed ?? 0;
  const landing: [number, number] = routeTotal ? [routeTotal, routeTotal] : [Math.min(tsl, standard), Math.max(tsl, standard)];
  const housingAd = family ? UAE.rentFamilyAed : UAE.rentSingleAed;
  const housingHome = home ? (family ? home.rentFamilyAed : home.rentSingleAed) : null;
  const units = family ? 1 : movers;
  const firstYear: CompareCardData["firstYear"] = [
    {
      label: "Landing, one-off (Atlas71 all-in)",
      abuDhabiAed: landing,
      homeAed: null,
      note: routeTotal ? undefined : "Startup licence or standard ADGM licence, until the route is checked",
    },
    {
      label: family ? "Family home, 2-bed, 12 months" : `Housing, 1-bed × ${units}, 12 months`,
      abuDhabiAed: range(housingAd[0] * units, housingAd[1] * units),
      homeAed: housingHome ? range(housingHome[0] * units, housingHome[1] * units) : null,
      note: "Estimate from listing averages",
    },
  ];
  if (kids) {
    firstYear.push({
      label: kids > 1 ? `International school × ${kids}, 12 months` : "International school, 12 months",
      abuDhabiAed: range(UAE.schoolAed[0] * kids, UAE.schoolAed[1] * kids),
      homeAed: home?.schoolAed ? range(home.schoolAed[0] * kids, home.schoolAed[1] * kids) : null,
      note: "Estimate; fees vary by school and grade",
    });
  }

  const company = p.company ?? "your company";
  const wins = ["cuts the tax bill"];
  if (gcc) wins.push("puts you next to Gulf customers");
  if (raising) wins.push("opens Hub71 and Gulf investors");
  const life = family ? ", with residency for the whole family" : hiring ? ", with visas for the team" : "";
  const verdict = home
    ? `Abu Dhabi ${wins.join(", ").replace(/, ([^,]*)$/, " and $1")} for ${company}${life}; ${label} stays cheaper to live in.`
    : `Abu Dhabi ${wins.join(", ").replace(/, ([^,]*)$/, " and $1")} for ${company}${life}. Atlas71 has no verified data for ${label} yet, so compare that side yourself.`;

  const sourceIds = [...new Set([...rows.flatMap((r) => r.sourceIds), ...UAE.costSources, ...(home?.costSources ?? [])])];
  return { homeBase: p.homeBase ?? label, homeLabel: label, verdict, rows, firstYear, checks, checksMeta: meta, sources: sourceRefs(sourceIds) };
}
