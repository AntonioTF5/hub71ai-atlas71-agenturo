import type { PlanCardData } from "@/lib/atlas/types";
import { fmtDay, isIsoDate } from "@/lib/atlas/format";
import { IconCalendar } from "../icons";
import { MilestoneTiles, StepRow } from "../plan-parts";
import { SandboxPill, SourceRow } from "../ui";
import { CardSection, CardShell } from "./CardShell";

export function PlanCard({ data }: { data: PlanCardData }) {
  const groups = (data.groups ?? []).filter((g) => g.steps?.length);
  const steps = groups.flatMap((g) => g.steps);
  const done = steps.filter((s) => s.status === "done").length;
  const asOf = isIsoDate(data.today) ? `as of ${fmtDay(data.today)}` : "";
  return (
    <CardShell
      icon={<IconCalendar size={19} />}
      title="Your plan"
      subtitle={[data.routeName, done ? `${done} of ${steps.length} steps done` : `${steps.length} steps`, asOf].filter(Boolean).join(" · ")}
      meta={<SandboxPill />}
    >
      <MilestoneTiles milestones={data.milestones ?? []} />
      {groups.map((g) => (
        <CardSection key={g.label} label={g.label} className="mt-6">
          <ul className="divide-y divide-line">
            {g.steps.map((s) => (
              <StepRow key={s.id} step={s} today={data.today} />
            ))}
          </ul>
        </CardSection>
      ))}
      {data.sources?.length ? (
        <div className="mt-5 border-t border-line pt-4">
          <SourceRow sources={data.sources} />
        </div>
      ) : null}
    </CardShell>
  );
}
