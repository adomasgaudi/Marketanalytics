import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const body = `export const APP_VERSION = "${pkg.version}";
export const APP_VERSION_LABEL = \`v\${APP_VERSION}\`;
`;

writeFileSync(new URL("../src/app-version.ts", import.meta.url), body);

// AGENTS.md carries a human-visible version number too. Derive it from the same source
// so the two can't drift — run `pnpm version:write` after bumping package.json.
const agentsUrl = new URL("../AGENTS.md", import.meta.url);
const agents = readFileSync(agentsUrl, "utf8");
const stamped = agents.replace(/^> v.*$/m, `> v${pkg.version}`);
if (stamped === agents) {
  throw new Error("AGENTS.md: no '> vN' version line found to stamp");
}
writeFileSync(agentsUrl, stamped);
