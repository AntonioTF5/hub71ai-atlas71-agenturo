// Save a file built in the browser (the landing pack, the case file) through a temporary object URL.
import type { ExportFile } from "./context";

/** Returns false when the browser couldn't build or start the download. */
export function saveFile(file: ExportFile | null): boolean {
  if (!file) return false;
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
    return true;
  } catch {
    return false;
  }
}
