"use client";

import { useState } from "react";
import { fmtDay, isIsoDate } from "@/lib/atlas/format";
import { useAtlasUi } from "../context";
import { IconDownload, IconFile } from "../icons";
import { BUTTON, SandboxPill, cx } from "../ui";
import { CardShell } from "./CardShell";

/** Both files are built in the browser from the live case at click time, so they're always current. */
export function ExportCard({ data }: { data: { generatedOn: string } }) {
  const ui = useAtlasUi();
  const [failed, setFailed] = useState(false);

  const download = (ext: "md" | "json") => {
    const file = ui.exportFile(ext);
    if (!file) {
      setFailed(true);
      return;
    }
    setFailed(false);
    try {
      const url = URL.createObjectURL(new Blob([file.body], { type: file.type }));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2_000);
    } catch {
      setFailed(true);
    }
  };

  return (
    <CardShell
      icon={<IconFile size={19} />}
      title="Your landing pack"
      subtitle={`Route, plan, price, filings and deadlines${isIsoDate(data?.generatedOn) ? ` · as of ${fmtDay(data.generatedOn)}` : ""}`}
      meta={<SandboxPill />}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button type="button" className={cx(BUTTON.primary, "h-12 sm:flex-1")} onClick={() => download("md")}>
          <IconDownload size={18} />
          Download pack (.md)
        </button>
        <button type="button" className={cx(BUTTON.secondary, "h-12 sm:flex-1")} onClick={() => download("json")}>
          <IconDownload size={18} />
          Download case (.json)
        </button>
      </div>
      <p className="mt-3 text-[13px] leading-snug text-muted" role={failed ? "alert" : undefined}>
        {failed
          ? "Couldn't build the file in this browser. Try again, or use another browser."
          : "Built on this device from your case. Nothing is uploaded."}
      </p>
    </CardShell>
  );
}
