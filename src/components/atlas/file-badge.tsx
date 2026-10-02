// The tile that stands for an attached file without a thumbnail: PDFs in red, photos in teal.
import { IconFile, IconImage } from "./icons";
import { cx } from "./ui";

export function FileBadge({ mime, className }: { mime: string; className?: string }) {
  const pdf = mime === "application/pdf";
  return (
    <span
      aria-hidden="true"
      className={cx(
        "relative grid size-10 shrink-0 place-items-center rounded-lg",
        pdf ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent-ink",
        className,
      )}
    >
      {pdf ? (
        <>
          <IconFile size={18} className="-mt-2.5" />
          <span className="absolute inset-x-0 bottom-[5px] text-center text-[8.5px] font-bold leading-none tracking-[0.06em]">PDF</span>
        </>
      ) : (
        <IconImage size={18} />
      )}
    </span>
  );
}
