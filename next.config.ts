import type { NextConfig } from "next";
import { join } from "path";
import { readFileSync, existsSync } from "fs";

const envPath = join(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
  if (match) {
    process.env.OPENAI_API_KEY = match[1].trim();
  }
}

const nextConfig: NextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
};

// TODO(pwa): next-pwa@5.6.0 injects a webpack config which is incompatible with
// Next 16's Turbopack-default build (worker error on `next build`). Service worker
// install is deferred until next-pwa ships a Turbopack-compatible release (or we
// swap to @serwist/next). Offline behavior already works via the IndexedDB outbox,
// so this is not a blocker for the scaffolding milestone. Manifest is still linked
// from src/app/layout.tsx so the app remains installable as a basic PWA.

export default nextConfig;
