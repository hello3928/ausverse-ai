/**
 * Release script for Ausverse AI Desktop
 *
 * Usage:
 *   node scripts/release.js [patch|minor|major]
 *
 * Steps:
 *   1. Bumps the version in package.json
 *   2. Builds the installer with electron-builder
 *   3. Publishes to GitHub Releases (requires GH_TOKEN env var)
 *
 * Setup:
 *   Set GH_TOKEN as an environment variable with a GitHub personal access token
 *   that has "repo" scope. You can create one at:
 *   https://github.com/settings/tokens
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");

// Read current version
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);

// Determine bump type
const bump = process.argv[2] || "patch";
let newVersion;
if (bump === "major") newVersion = `${major + 1}.0.0`;
else if (bump === "minor") newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

// Check for GH_TOKEN
if (!process.env.GH_TOKEN) {
  console.error("\x1b[31mError: GH_TOKEN environment variable is required.\x1b[0m");
  console.error("Create a token at https://github.com/settings/tokens (repo scope)");
  console.error("Then: set GH_TOKEN=ghp_... (Windows) or export GH_TOKEN=ghp_... (Unix)");
  process.exit(1);
}

console.log(`\n  Ausverse AI Desktop Release`);
console.log(`  ${pkg.version} → ${newVersion}\n`);

// Bump version
pkg.version = newVersion;
fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
console.log(`  ✓ Version bumped to ${newVersion}`);

// Install dependencies
console.log(`  ⟳ Installing dependencies...`);
execSync("npm install", { cwd: ROOT, stdio: "inherit" });

// Build and publish
console.log(`  ⟳ Building and publishing...\n`);
execSync("npx electron-builder --publish always", {
  cwd: ROOT,
  stdio: "inherit",
  env: { ...process.env, EP_GH_IGNORE_TIME: "true" },
});

console.log(`\n  ✓ v${newVersion} published to GitHub Releases\n`);
