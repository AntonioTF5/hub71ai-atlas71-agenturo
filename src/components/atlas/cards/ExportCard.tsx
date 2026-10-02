"use client";

import { useMemo, useState } from "react";
import { fmtDay, isIsoDate } from "@/lib/atlas/format";
import { packDocuments } from "@/lib/atlas/pack";
import { useAtlasUi } from "../context";
import { saveFile } from "../download";
import { IconDownload, IconFile } from "../icons";
import { BUTTON, MicroLabel, SandboxPill, cx } from "../ui";
import { CardShell } from "./CardShell";

/** Every file is built in the browser from the live case at click time, so it's always current. */
export function ExportCard({ data }: { data: { generatedOn: string } }) {
  const ui = useAtlasUi();
  const [failed, setFailed] = useState(false);

  // One chip per kind of document: "Dependant residence visa ×2".
  const docs = useMemo(() => {
    const counts = new Map<string, number>();
    try {
      for (const d of packDocuments(ui.state)) counts.set(d.title, (counts.get(d.title) ?? 0) + 1);
    } catch {
      // An engine edge case shows an empty list; the download still tries.
    }
    return [...counts];
  }, [ui.state]);
  const total = docs.reduce((n, [, c]) => n + c, 0);

  const download = (ext: "md" | "json" | "zip") => setFailed(!saveFile(ui.exportFile(ext)));

  return (
    <CardShell
      icon={<IconFile size={19} />}
      title="Your landing pack"
      subtitle={`Every document, plan and deadline${isIsoDate(data?.generatedOn) ? ` · as of ${fmtDay(data.generatedOn)}` : ""}`}
      meta={<SandboxPill />}
    >
      <button type="button" className={cx(BUTTON.primary, "h-12 w-full")} onClick={() => download("zip")}>
        <IconDownload size={18} />
        Download everything (.zip)
      </button>

      <div className="mt-4">
        <MicroLabel>In the ZIP</MicroLabel>
        <p className="mt-1.5 text-pretty text-[14px] leading-snug text-ink">
          The landing summary, the case file and{" "}
          {total ? `${total} simulated ${total === 1 ? "document" : "documents"}:` : "each document once it's issued."}
        </p>
        {docs.length ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {docs.map(([title, count]) => (
              <li key={title} className="rounded-full border border-line bg-sunken px-2.5 py-1 text-[12.5px] text-ink">
                {title}
                {count > 1 ? <span className="tabular-nums text-muted"> ×{count}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" className={cx(BUTTON.quiet, "min-h-10 px-3 text-[14px]")} onClick={() => download("md")}>
          <IconDownload size={16} />
          Summary only (.md)
        </button>
        <button type="button" className={cx(BUTTON.quiet, "min-h-10 px-3 text-[14px]")} onClick={() => download("json")}>
          <IconDownload size={16} />
          Case file (.json)
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-muted" role={failed ? "alert" : undefined}>
        {failed
          ? "Couldn't build the file in this browser. Try again, or use another browser."
          : "Built on this device from your case; nothing is uploaded. Each document is marked as a sandbox simulation."}
      </p>
    </CardShell>
  );
}
