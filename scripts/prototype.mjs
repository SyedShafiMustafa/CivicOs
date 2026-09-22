/**
 * Prototype launcher — sets CIVICOS_DIST (and optionally PORT) before
 * spawning any `next` command, so each prototype host builds and serves from
 * its own distDir. Works identically on Windows cmd/PowerShell and POSIX
 * shells; avoids a cross-env dependency.
 *
 * Usage:
 *   node scripts/prototype.mjs <port> <distDir> build|start [next args...]
 *
 * Examples:
 *   node scripts/prototype.mjs 3001 .next-ios build
 *   node scripts/prototype.mjs 3001 .next-ios start
 */
const [port, distDir, command, ...extra] = process.argv.slice(2);
if (!port || !distDir || !["build", "start"].includes(command)) {
  console.error("usage: node scripts/prototype.mjs <port> <distDir> build|start [args]");
  process.exit(1);
}

process.env.PORT = String(port);
process.env.CIVICOS_DIST = distDir;

const { createRequire } = await import("node:module");
const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");

const { spawnSync } = await import("node:child_process");
const args = [nextCli, command];
if (command === "start") args.push("-p", port); // build takes no port
args.push(...extra);
const res = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: process.env,
});
process.exit(res.status ?? 1);
