/** @type {import('next').NextConfig} */

/**
 * distDir is switched explicitly via CIVICOS_DIST so the three hosts never
 * share build artifacts:
 *
 *   :3000  dev / default build → .next         (desktop survey app)
 *   :3001  CIVICOS_DIST=.next-ios    → iOS prototype (production build)
 *   :3002  CIVICOS_DIST=.next-mobile → field-survey prototype (production)
 *
 * The prototype npm scripts (build:ios, start:ios, build:survey,
 * start:survey) set the variable through scripts/prototype.mjs, which works
 * identically on Windows cmd, PowerShell and POSIX shells. Normal
 * development on :3000 can therefore never corrupt a running prototype.
 */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.CIVICOS_DIST || ".next",
};

export default nextConfig;
