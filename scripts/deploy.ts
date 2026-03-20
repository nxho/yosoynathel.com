/**
 * Build assets and rsync to remote server.
 *
 * Requires: DEPLOY_TARGET (e.g. "user@host:/var/www/yosoynathel")
 * Optional: BUILD_SITE=false | BUILD_INTERACTIVE=false to skip a build
 *
 * 1. Syncs markdown/content into apps/site (bun run sync)
 * 2. Builds apps/site (Eleventy → _site)
 * 3. Builds apps/interactive (Next → .next)
 * 4. Rsyncs site static files and interactive app to DEPLOY_TARGET
 *
 * On the server, for the interactive app run: cd interactive && bun install --production && bun run start
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DEPLOY_TARGET = process.env.DEPLOY_TARGET;
const BUILD_SITE = process.env.BUILD_SITE !== "false";
const BUILD_INTERACTIVE = process.env.BUILD_INTERACTIVE !== "false";

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit", shell: true });
    p.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

async function main() {
  if (!DEPLOY_TARGET?.includes(":")) {
    console.error("Set DEPLOY_TARGET (e.g. user@host:/var/www/yosoynathel)");
    process.exit(1);
  }

  if (BUILD_SITE) {
    console.log("Syncing markdown (site content)...");
    await run("bun", ["run", "sync"], join(ROOT, "apps/site"));
    console.log("Building site (Eleventy)...");
    await run("bun", ["run", "build"], join(ROOT, "apps/site"));
    const siteOut = join(ROOT, "apps/site/_site");
    if (!existsSync(siteOut)) {
      console.error("Site build output not found: apps/site/_site");
      process.exit(1);
    }
  }

  if (BUILD_INTERACTIVE) {
    console.log("Building interactive (Next)...");
    await run("bun", ["run", "build"], join(ROOT, "apps/interactive"));
    const nextOut = join(ROOT, "apps/interactive/.next");
    if (!existsSync(nextOut)) {
      console.error("Interactive build output not found: apps/interactive/.next");
      process.exit(1);
    }
    await run(
      "mv",
      [
        ".next/standalone/apps/interactive/*",
        ".next/standalone/apps/interactive/.next",
        ".next/standalone",
      ],
      join(ROOT, "apps/interactive"),
    );
    await run(
      "rm",
      ["-rf", "apps"],
      join(ROOT, "apps/interactive/.next/standalone"),
    );
    await run(
      "cp",
      ["-r", "public", ".next/standalone"],
      join(ROOT, "apps/interactive"),
    );
    await run(
      "cp",
      ["-r", ".next/static", ".next/standalone/.next"],
      join(ROOT, "apps/interactive"),
    );
  }

  console.log("Syncing to remote...");

  const colon = DEPLOY_TARGET.indexOf(":");
  const sshTarget = DEPLOY_TARGET.slice(0, colon);
  const remotePath = DEPLOY_TARGET.slice(colon + 1);
  await run(
    "ssh",
    [sshTarget, `mkdir -p "${remotePath}" "${remotePath}/scripts"`],
    ROOT,
  );

  const scriptNames = [
    "setup-server.sh",
    "generate-admin-key.ts",
    "enable-service.sh",
    "restart-service.sh",
    "tail-logs.sh",
  ];
  const scriptsToSync = scriptNames
    .map((name) => ({ name, path: join(ROOT, "scripts", name) }))
    .filter(({ path }) => existsSync(path));
  if (scriptsToSync.length > 0) {
    await run(
      "rsync",
      ["-av", ...scriptsToSync.map((s) => s.path), `${DEPLOY_TARGET}/scripts/`],
      ROOT,
    );
    console.log(
      "Scripts synced: " + scriptsToSync.map((s) => s.name).join(", "),
    );
  }

  if (BUILD_SITE) {
    await run(
      "rsync",
      [
        "-av",
        "--delete",
        join(ROOT, "apps/site/_site") + "/",
        `${DEPLOY_TARGET}/site/`,
      ],
      ROOT,
    );
    console.log("Site synced to " + DEPLOY_TARGET + "/site/");
  }

  if (BUILD_INTERACTIVE) {
    const interactiveDir = join(ROOT, "apps/interactive/.next/standalone");
    await run(
      "rsync",
      [
        "-av",
        "--delete",
        "--exclude=.env",
        "--exclude=.git",
        "--exclude=uploads",
        interactiveDir + "/",
        `${DEPLOY_TARGET}/interactive/`,
      ],
      ROOT,
    );
    console.log("Interactive app synced to " + DEPLOY_TARGET + "/interactive/");
  }

  await run(
    "ssh",
    [sshTarget, `/${remotePath}/scripts/restart-service.sh`],
    ROOT,
  );
  console.log("Interactive service restarted on remote server.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
