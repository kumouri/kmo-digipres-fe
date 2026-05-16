#!/usr/bin/env node
/**
 * gen-api.mjs — codegen script for kmo-digipres-fe
 *
 * Usage:
 *   node scripts/gen-api.mjs          # generate (copies spec + runs openapi-typescript)
 *   node scripts/gen-api.mjs --check  # exits non-zero if committed output is stale
 *
 * Source of truth: ../kmo-digipres-be/docs/api/openapi.json (sibling repo)
 * Vendored copy:   packages/crm-components/openapi/openapi.json
 * Generated file:  packages/crm-components/src/types/openapi.ts
 */

import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SOURCE_SPEC = resolve(root, "..", "kmo-digipres-be", "docs", "api", "openapi.json");
const VENDORED_DIR = resolve(root, "packages", "crm-components", "openapi");
const VENDORED_SPEC = resolve(VENDORED_DIR, "openapi.json");
const GENERATED_FILE = resolve(root, "packages", "crm-components", "src", "types", "openapi.ts");

const CHECK_MODE = process.argv.includes("--check");

// Ensure vendored directory exists
mkdirSync(VENDORED_DIR, { recursive: true });

if (CHECK_MODE) {
  // In check mode: regenerate to a temp file and diff vs committed
  if (!existsSync(GENERATED_FILE)) {
    console.error("ERROR: Generated file does not exist:", GENERATED_FILE);
    process.exit(1);
  }

  const tmpDir = resolve(tmpdir(), `gen-api-check-${randomBytes(6).toString("hex")}`);
  mkdirSync(tmpDir, { recursive: true });
  const tmpSpec = resolve(tmpDir, "openapi.json");
  const tmpOut = resolve(tmpDir, "openapi.ts");

  // Copy current spec to temp
  copyFileSync(SOURCE_SPEC, tmpSpec);

  // Generate to temp file
  execSync(
    `node node_modules/openapi-typescript/bin/cli.js "${tmpSpec}" -o "${tmpOut}"`,
    { stdio: "inherit", cwd: root }
  );

  const committed = readFileSync(GENERATED_FILE, "utf8");
  const fresh = readFileSync(tmpOut, "utf8");

  if (committed === fresh) {
    console.log("OK: openapi.ts is up to date.");
    process.exit(0);
  } else {
    console.error("DRIFT DETECTED: packages/crm-components/src/types/openapi.ts is stale.");
    console.error("Run `npm run gen:api` to regenerate.");
    process.exit(1);
  }
} else {
  // Generate mode: copy spec + generate
  console.log("Copying spec:", SOURCE_SPEC, "->", VENDORED_SPEC);
  copyFileSync(SOURCE_SPEC, VENDORED_SPEC);

  console.log("Generating types:", VENDORED_SPEC, "->", GENERATED_FILE);
  execSync(
    `node node_modules/openapi-typescript/bin/cli.js "${VENDORED_SPEC}" -o "${GENERATED_FILE}"`,
    { stdio: "inherit", cwd: root }
  );

  console.log("Done. Generated:", GENERATED_FILE);
}
