import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.openai.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
}

export default nextConfig
