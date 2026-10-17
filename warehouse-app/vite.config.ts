import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base is only non-root in a combined deployment. Two of those exist:
// Vercel (see /vercel-build.sh and /vercel.json at the repo root), where
// this app's build output is served from /warehouse/ at the domain root,
// and the interim GitHub Pages preview (see /gh-pages-build.sh and
// /.github/workflows/gh-pages.yml), where the whole site sits one level
// deeper under the repo name (a GitHub Pages project site, not a
// user/org site) -- /HarvestLock/warehouse/, not /warehouse/. Vercel
// sets VERCEL=1 during builds; the Pages workflow sets GITHUB_PAGES=true
// the same way. Local `vite`/`vite build` runs have neither, so local
// dev and standalone builds stay at root.
// Short commit SHA of the build, surfaced in the UI footer. Hosts that
// build from a tarball (Vercel) or detached checkout expose the full SHA
// via env; otherwise ask git. Absent entirely (no git, no env) => the UI
// simply omits the footer rather than showing a made-up value.
function buildSha(): string | undefined {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || undefined;
  } catch {
    return undefined;
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_BUILD_SHA": JSON.stringify(buildSha()),
  },
  base: process.env.VERCEL ? "/warehouse/" : process.env.GITHUB_PAGES ? "/HarvestLock/warehouse/" : "/",
});
