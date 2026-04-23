import type { NextConfig } from "next";
import path from "node:path";

const basePath = "/react-native-tdlib";

const devOrigins = process.env.ALLOWED_DEV_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: `${basePath}/`,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  ...(devOrigins?.length ? { allowedDevOrigins: devOrigins } : {}),
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
