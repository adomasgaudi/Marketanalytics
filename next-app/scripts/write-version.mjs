import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const body = `export const APP_VERSION = "${pkg.version}";
export const APP_VERSION_LABEL = \`v\${APP_VERSION}\`;
`;

writeFileSync(new URL("../src/app-version.ts", import.meta.url), body);
