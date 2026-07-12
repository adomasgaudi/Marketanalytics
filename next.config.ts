import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev overlay. Compile/runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
