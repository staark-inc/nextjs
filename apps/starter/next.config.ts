import type { NextConfig } from "next";
import { staarkSecurityHeaders } from "@staark/platform/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Compile the workspace theme/core TypeScript sources directly.
  transpilePackages: ["@staark/core", "@staark/platform", "@staark/theme-kit", "@staark/theme-light", "@staark/theme-salong", "@staark/theme-gastfrihet", "@staark/theme-byra", "@staark/theme-webb"],
  async headers() {
    return [{ source: "/:path*", headers: staarkSecurityHeaders() }];
  },
};

export default nextConfig;
