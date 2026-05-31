const { contextBridge, ipcRenderer } = require("electron");

let appVersion = "0.0.0";
try {
  appVersion = require("./package.json").version;
} catch {
  try {
    appVersion = require(require("path").join(__dirname, "package.json")).version;
  } catch {}
}

try {
  contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: true,
    appVersion,
    installUpdate: () => ipcRenderer.send("install-update"),
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

    // Agent settings
    getAgentSettings: () => ipcRenderer.invoke("get-agent-settings"),
    setAgentSettings: (settings) => ipcRenderer.invoke("set-agent-settings", settings),
    testAgentCapture: () => ipcRenderer.invoke("test-agent-capture"),
  });
} catch (err) {
  console.error("Preload failed:", err);
}
