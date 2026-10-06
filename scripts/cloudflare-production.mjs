import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Verified against the bayti project's production deployment in Convex.
const deployment = "vivid-wildebeest-480";
const cloudUrl = `https://${deployment}.eu-west-1.convex.cloud`;
const siteUrl = `https://${deployment}.eu-west-1.convex.site`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) fail(result.error.message);
  process.exit(result.status ?? 1);
}

switch (process.argv[2]) {
  case "deploy-convex": {
    const key = process.env.CONVEX_DEPLOY_KEY;
    if (!key?.startsWith(`prod:${deployment}|`) || !key.split("|")[1]) {
      fail(
        `Set CONVEX_DEPLOY_KEY to a production deploy key for ${deployment} in Cloudflare Build variables and secrets. Development, preview, and other project keys are rejected.`,
      );
    }
    // Pass --cmd as one argument, independent of the build service's quoting.
    // Convex injects both canonical public URLs into this child build command.
    run("node", [
      fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url)),
      "deploy",
      "--cmd",
      "bun run build:cf:production",
      "--cmd-url-env-var-name",
      "NEXT_PUBLIC_CONVEX_URL",
    ]);
    break;
  }
  case "build":
    for (const [name, expected] of [
      ["NEXT_PUBLIC_CONVEX_URL", cloudUrl],
      ["NEXT_PUBLIC_CONVEX_SITE_URL", siteUrl],
    ]) {
      if (process.env[name] !== expected) {
        fail(`${name} must point to bayti production (${expected}). Use bun run build:cf:ci in Cloudflare Builds.`);
      }
    }
    run("bun", ["run", "build:cf"]);
    break;
  default:
    fail("Usage: node scripts/cloudflare-production.mjs <deploy-convex|build>");
}
