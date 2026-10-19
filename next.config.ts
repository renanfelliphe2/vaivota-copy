import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Domínio do Supabase Storage (imagens dos candidatos): next/image só otimiza hosts liberados aqui.
// `SUPABASE_URL` precisa estar definida também no build (na Vercel, variável de ambiente do projeto).
function remotePatterns(): NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> {
  const url = process.env.SUPABASE_URL?.trim();
  if (!url) return [];
  try {
    const { hostname } = new URL(url);
    return [{ protocol: "https", hostname, pathname: "/storage/v1/object/public/**" }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  // Permite um diretório de build próprio (por exemplo, para rodar `next build` sem tocar no `next dev` aberto).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { remotePatterns: remotePatterns() },
  async redirects() {
    return [
      {
        source: "/e/semana-tech/:path*",
        destination: "/e/maratona-tech-tivit/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

// Sentry (ST6): sem envio de mapas de código (não há token); o SDK só liga com DSN (src/lib/sentry.ts).
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});
