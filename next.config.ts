import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev overlay. Compile/runtime errors still surface.
  devIndicators: false,
  // The shared dev corner ships raw TypeScript — Next compiles it in place.
  transpilePackages: ["@adomas/dev-tools"],
  // The dev-tools package is a file: symlink into ../../Meta apps/dev-tools —
  // widen Turbopack's file-system root so it can follow the link.
  turbopack: { root: path.resolve(__dirname, "..", "..") },
  // Next blocks cross-origin dev resources (/_next/*, HMR) by default, so a
  // phone hitting http://<lan-ip>:3000 gets the HTML but no client JS — the
  // page renders and nothing is clickable. Allow the LAN to test on device.
  allowedDevOrigins: ["192.168.7.56", "192.168.*.*", "172.21.*.*"],
};

export default nextConfig;
