const { contextBridge, ipcRenderer } = require("electron");

try {
  contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: true,
    appVersion: "0.1.19",
    installUpdate: () => ipcRenderer.send("install-update"),
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    getAgentSettings: () => ipcRenderer.invoke("get-agent-settings"),
    setAgentSettings: (settings) => ipcRenderer.invoke("set-agent-settings", settings),
    testAgentCapture: () => ipcRenderer.invoke("test-agent-capture"),
  });
} catch (err) {
  console.error("Preload failed:", err);
}
