import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["mermaid", "@mermaid-js/parser"],
};

export default nextConfig;
