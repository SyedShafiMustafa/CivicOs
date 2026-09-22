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
 *   - CIVICOS_ROOT picks which prototype the root path serves. Vercel
 *     production takes it from project env (civicos → /mobile, civicos-ios
 *     → /ios); local prototype hosts from the port. These MUST live in
 *     beforeFiles — plain rewrites run after filesystem matching, so "/"
 *     would keep rendering the desktop page.tsx.
 *   - Deep links are unaffected.
 */
const isVercel = !!process.env.VERCEL;
// CIVICOS_ROOT selects the prototype served at "/" (e.g. "/ios", "/mobile").
// Git-Bash on Windows mangles a leading "/" env value into a drive path
// (C:/Program Files/Git/ios) — sanitize so a mangled value can't brick the
// build; on Vercel's Linux builders the value arrives intact.
const rawRoot = (process.env.CIVICOS_ROOT || "").replace(/^[A-Za-z]:[\\/](Program Files[\\/])?Git[\\/]/, "");
const rootDest =
  rawRoot === "/ios" || rawRoot === "/mobile"
    ? rawRoot
    : isVercel
      ? "/mobile"
      : null;

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.CIVICOS_DIST || ".next",
  async rewrites() {
    const before = rootDest ? [{ source: "/", destination: rootDest }] : [];
    if (isVercel) return { beforeFiles: before };
    return {
      beforeFiles: before,
      afterFiles: [
        { source: "/", has: [{ type: "host", value: "localhost:3001" }], destination: "/ios" },
        { source: "/", has: [{ type: "host", value: "127.0.0.1:3001" }], destination: "/ios" },
        { source: "/", has: [{ type: "host", value: "localhost:3002" }], destination: "/mobile" },
        { source: "/", has: [{ type: "host", value: "127.0.0.1:3002" }], destination: "/mobile" },
      ],
    };
  },
};

export default nextConfig;
