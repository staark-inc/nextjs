import path from "node:path";
import type { NextConfig } from "next";
import { staarkSecurityHeaders } from "@staark/platform/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a small production Docker image.
  output: "standalone",
  // Trace files from the monorepo root so standalone includes workspace packages.
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  // Compile the workspace theme/core TypeScript sources directly.
  transpilePackages: ["@staark/core", "@staark/platform", "@staark/theme-kit", "@staark/theme-light", "@staark/theme-salong", "@staark/theme-gastfrihet", "@staark/theme-byra", "@staark/theme-webb"],
  async headers() {
    return [{ source: "/:path*", headers: staarkSecurityHeaders() }];
  },
};

export default nextConfig;
