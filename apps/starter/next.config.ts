import type { NextConfig } from "next";
import { staarkSecurityHeaders } from "@staark/core/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Compile the workspace theme/core TypeScript sources directly.
  transpilePackages: ["@staark/core", "@staark/theme-kit", "@staark/theme-light", "@staark/theme-salong", "@staark/theme-gastfrihet"],
  async headers() {
    return [{ source: "/:path*", headers: staarkSecurityHeaders() }];
  },
};

export default nextConfig;
