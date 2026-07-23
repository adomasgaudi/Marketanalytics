import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// @adomas/dev-tools is optional and lives OUTSIDE this repo (file:../../Meta
// apps/dev-tools), so CI installs without it. Probe for it once: when it's
// missing we alias the specifier to a local stub, which is what lets a clean
// clone — and the Pages build — compile at all.
const devToolsDir = path.join(__dirname, "node_modules", "@adomas", "dev-tools");
const hasDevTools = fs.existsSync(devToolsDir);

const nextConfig: NextConfig = {
  output: "export",
  // Hide the floating dev overlay. Compile/runtime errors still surface.
  devIndicators: false,
  // The shared dev corner ships raw TypeScript — Next compiles it in place.
  transpilePackages: hasDevTools ? ["@adomas/dev-tools"] : [],
  // The dev-tools package is a file: symlink into ../../Meta apps/dev-tools —
  // widen Turbopack's file-system root so it can follow the link.
  turbopack: {
    root: path.resolve(__dirname, "..", ".."),
    ...(hasDevTools
      ? {}
      : { resolveAlias: { "@adomas/dev-tools": "./src/dev/dev-corner-stub.tsx" } }),
  },
  webpack: (config) => {
    if (!hasDevTools) {
      config.resolve ??= {};
      config.resolve.alias = {
        ...config.resolve.alias,
        "@adomas/dev-tools": path.resolve(__dirname, "src/dev/dev-corner-stub.tsx"),
      };
    }
    return config;
  },
  // Next blocks cross-origin dev resources (/_next/*, HMR) by default, so a
  // phone hitting http://<lan-ip>:3000 gets the HTML but no client JS — the
  // page renders and nothing is clickable. Allow the LAN to test on device.
  allowedDevOrigins: ["192.168.7.56", "192.168.*.*", "172.21.*.*"],
};

export default nextConfig;
