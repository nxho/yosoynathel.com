/**
 * Generates a new PHOTOS_ADMIN_SECRET and writes it to .env.
 * Run from repo root: bun run scripts/generate-admin-key.ts
 * On server (deploy root): bun run scripts/generate-admin-key.ts
 */

import { writeFile, readFile } from "fs/promises";
import { existsSync } from "node:fs";
import { join } from "path";

const base = process.cwd();
const ENV_PATH = existsSync(join(base, "photos"))
  ? join(base, "photos", ".env")
  : join(base, "apps", "photos", ".env");
const VAR_NAME = "PHOTOS_ADMIN_SECRET";

function generateKey(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    throw new Error("crypto.getRandomValues not available");
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  const key = generateKey();
  let content = "";

  try {
    content = await readFile(ENV_PATH, "utf-8");
  } catch {
    // .env doesn't exist yet
  }

  const lineRegex = new RegExp(`^(${VAR_NAME})=.*$`, "m");
  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, `${VAR_NAME}=${key}`);
  } else {
    content = content.trimEnd();
    if (content) content += "\n";
    content += `${VAR_NAME}=${key}\n`;
  }

  await writeFile(ENV_PATH, content);
  console.log(`Updated ${ENV_PATH}`);
  console.log(`${VAR_NAME} has been set to a new random key.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
