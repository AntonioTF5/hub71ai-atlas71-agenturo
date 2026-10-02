// SOUL.md -> src/lib/atlas/soul.generated.ts. Run by `npm run soul` and before dev, test and build.
// Strips HTML comments and everything before the first <identity> tag, then writes the text as a string constant.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(root, "SOUL.md"), "utf8");
const body = raw.replace(/<!--[\s\S]*?-->/g, "");
const start = body.indexOf("<identity>");
if (start < 0) throw new Error("SOUL.md has no <identity> chapter");
const soul = body.slice(start).trim();

const out = `// Generated from SOUL.md by scripts/build-soul.mjs. Edit SOUL.md, then run \`npm run soul\`.
export const SOUL = ${JSON.stringify(soul)};
`;
writeFileSync(join(root, "src/lib/atlas/soul.generated.ts"), out);
console.log(`soul: ${soul.length} characters -> src/lib/atlas/soul.generated.ts`);
