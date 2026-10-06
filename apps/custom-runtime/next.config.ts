import path from "node:path";

import type {
  NextConfig,
} from "next";

import {
  staarkSecurityHeaders,
} from "@staark/platform/config";

const nextConfig:
  NextConfig = {
  reactStrictMode:
    true,

  output:
    "standalone",

  outputFileTracingRoot:
    path.join(
      process.cwd(),
      "../../",
    ),

  transpilePackages: [
    "@staark/addon-blog",
    "@staark/core",
    "@staark/custom",
    "@staark/platform",
    "@staark/theme-kit",
    "@staark/theme-kit",
    "@staark/theme-light",
    "@staark/theme-byra",
    "@staark/theme-el",
    "@staark/theme-gastfrihet",
    "@staark/theme-kreator",
    "@staark/theme-salong",
    "@staark/theme-skonhet",
    "@staark/theme-verkstad",
    "@staark/theme-webb",
  ],

  async headers() {
    return [
      {
        source:
          "/:path*",

        headers:
          staarkSecurityHeaders(),
      },
    ];
  },
  
  allowedDevOrigins: [
    "192.168.0.10",
  ],
};

export default nextConfig;
