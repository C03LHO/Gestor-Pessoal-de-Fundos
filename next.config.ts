import type { NextConfig } from "next";

const headersSeguranca = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
];

const nextConfig: NextConfig = {
  experimental: {},
  async headers() {
    return [{ source: "/:path*", headers: headersSeguranca }];
  },
  async redirects() {
    // A aba Resumo foi removida; links/favoritos antigos caem no Dashboard.
    return [{ source: "/resumo", destination: "/", permanent: false }];
  },
};

export default nextConfig;
