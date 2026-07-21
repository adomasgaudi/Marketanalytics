import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const body = `export const APP_VERSION = "${pkg.version}";
export const APP_VERSION_LABEL = \`v\${APP_VERSION}\`;
`;

writeFileSync(new URL("../../src/app-version.ts", import.meta.url), body);

// AGENTS.md carries a human-visible version number too. Derive it from the same source
// so the two can't drift — run `pnpm version:write` after bumping package.json.
const agentsUrl = new URL("../../AGENTS.md", import.meta.url);
const agents = readFileSync(agentsUrl, "utf8");
const VERSION_LINE = /^> v.*$/m;
// Test for the line before replacing: an unchanged file means the version was
// already correct, which is success. Comparing before/after can't tell that
// apart from a missing line, and made a re-run of an up-to-date repo throw.
if (!VERSION_LINE.test(agents)) {
  throw new Error("AGENTS.md: no '> vN' version line found to stamp");
}
writeFileSync(agentsUrl, agents.replace(VERSION_LINE, `> v${pkg.version}`));
