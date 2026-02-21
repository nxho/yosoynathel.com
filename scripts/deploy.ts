/**
 * Build assets and rsync to remote server.
 *
 * Requires: DEPLOY_TARGET (e.g. "user@host:/var/www/yosoynathel")
 * Optional: BUILD_SITE=false | BUILD_PHOTOS=false to skip a build
 *
 * 1. Builds apps/site (Eleventy → _site)
 * 2. Builds apps/photos (Next → .next)
 * 3. Rsyncs site static files and photos app to DEPLOY_TARGET
 *
 * On the server, for the photos app run: cd photos && bun install --production && bun run start
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DEPLOY_TARGET = process.env.DEPLOY_TARGET;
const BUILD_SITE = process.env.BUILD_SITE !== "false";
const BUILD_PHOTOS = process.env.BUILD_PHOTOS !== "false";

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
    console.log("Building site (Eleventy)...");
    await run("bun", ["run", "build"], join(ROOT, "apps/site"));
    const siteOut = join(ROOT, "apps/site/_site");
    if (!existsSync(siteOut)) {
      console.error("Site build output not found: apps/site/_site");
      process.exit(1);
    }
  }

  if (BUILD_PHOTOS) {
    console.log("Building photos (Next)...");
    await run("bun", ["run", "build"], join(ROOT, "apps/photos"));
    const nextOut = join(ROOT, "apps/photos/.next");
    if (!existsSync(nextOut)) {
      console.error("Photos build output not found: apps/photos/.next");
      process.exit(1);
    }
    await run(
      "cp",
      ["-r", "public", ".next/standalone/apps/photos/"],
      join(ROOT, "apps/photos"),
    );
    await run(
      "cp",
      ["-r", ".next/static", ".next/standalone/apps/photos/.next"],
      join(ROOT, "apps/photos"),
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

  const setupScript = join(ROOT, "scripts", "setup-server.sh");
  if (existsSync(setupScript)) {
    await run(
      "rsync",
      ["-av", setupScript, `${DEPLOY_TARGET}/scripts/setup-server.sh`],
      ROOT,
    );
    console.log(
      "Setup script synced to " + DEPLOY_TARGET + "/scripts/setup-server.sh",
    );
  }

  const generateKeyScript = join(ROOT, "scripts", "generate-admin-key.ts");
  if (existsSync(generateKeyScript)) {
    await run(
      "rsync",
      [
        "-av",
        generateKeyScript,
        `${DEPLOY_TARGET}/scripts/generate-admin-key.ts`,
      ],
      ROOT,
    );
    console.log(
      "generate-admin-key synced to " +
        DEPLOY_TARGET +
        "/scripts/generate-admin-key.ts",
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

  if (BUILD_PHOTOS) {
    const photosDir = join(ROOT, "apps/photos/.next/standalone");
    await run(
      "rsync",
      [
        "-av",
        "--delete",
        // "--exclude=node_modules",
        "--exclude=.env",
        "--exclude=.git",
        photosDir + "/",
        `${DEPLOY_TARGET}/photos/`,
      ],
      ROOT,
    );
    console.log("Photos app synced to " + DEPLOY_TARGET + "/photos/");
  }

  console.log(
    "Done. On the server, run in photos dir: node app/photos/server.js",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
