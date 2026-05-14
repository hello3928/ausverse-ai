/**
 * Rebuilds better-sqlite3 against Electron's Node.js headers.
 * Runs automatically after `npm install` in the desktop/ directory.
 */
const { rebuild } = require("@electron/rebuild");
const path = require("path");

async function main() {
  const electronVersion = require("electron/package.json").version;
  console.log(`Rebuilding native modules for Electron ${electronVersion}...`);

  await rebuild({
    buildPath: path.resolve(__dirname, ".."),
    electronVersion,
    onlyModules: ["better-sqlite3"],
    force: true,
  });

  console.log("Native modules rebuilt successfully.");
}

main().catch((err) => {
  console.error("Failed to rebuild native modules:", err);
  process.exit(1);
});
