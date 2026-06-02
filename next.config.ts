import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.openai.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "sharp"],
}

export default nextConfig
