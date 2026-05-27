/**
 * afterPack hook — embed the app icon into the exe using rcedit.
 *
 * electron-builder's signAndEditExecutable is disabled because the
 * winCodeSign tool extraction fails on non-admin Windows (symlink
 * permissions). This hook runs rcedit directly to set the icon
 * without needing the signing toolchain.
 */
const path = require("path");
const { rcedit } = require("rcedit");

module.exports = async function (context) {
  if (process.platform !== "win32") return;

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(__dirname, "..", "icon.ico");

  console.log(`  • rcedit: setting icon on ${exeName}`);
  await rcedit(exePath, { icon: iconPath });
};
