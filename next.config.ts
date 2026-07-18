import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev overlay. Compile/runtime errors still surface.
  devIndicators: false,
  // The shared dev corner ships raw TypeScript — Next compiles it in place.
  transpilePackages: ["@adomas/dev-tools"],
  // The dev-tools package is a file: symlink into ../Meta apps/dev-tools —
  // widen Turbopack's file-system root so it can follow the link.
  turbopack: { root: path.resolve(__dirname, "..") },
};

export default nextConfig;
