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
 *
 * Root rewrites (previously Edge middleware — incompatible with Vercel's
 * services platform):
 *   - Vercel production: the deployment serves the field-survey phone
 *     prototype, so "/" renders /mobile.
 *   - Local prototype hosts: "/" rewrites to /ios on :3001 and /mobile on
 *     :3002, keeping the address bar clean. Deep links are unaffected.
 */
const isVercel = !!process.env.VERCEL;

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.CIVICOS_DIST || ".next",
  async rewrites() {
    if (isVercel) {
      return [
        { source: "/", destination: "/mobile" },
      ];
    }
    return [
      { source: "/", has: [{ type: "host", value: "localhost:3001" }], destination: "/ios" },
      { source: "/", has: [{ type: "host", value: "127.0.0.1:3001" }], destination: "/ios" },
      { source: "/", has: [{ type: "host", value: "localhost:3002" }], destination: "/mobile" },
      { source: "/", has: [{ type: "host", value: "127.0.0.1:3002" }], destination: "/mobile" },
    ];
  },
};

export default nextConfig;
