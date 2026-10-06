import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // vinext generates route types in .next; keep native Next output separate.
  distDir: "build/next",
};

export default nextConfig;
