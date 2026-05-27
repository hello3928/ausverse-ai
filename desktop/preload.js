const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  appVersion: require("./package.json").version,
  installUpdate: () => ipcRenderer.send("install-update"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),

  // Agent settings
  getAgentSettings: () => ipcRenderer.invoke("get-agent-settings"),
  setAgentSettings: (settings) => ipcRenderer.invoke("set-agent-settings", settings),
  dismissAgentPrompt: (enabled) => ipcRenderer.send("dismiss-agent-prompt", enabled),
  onAgentPromptResult: (cb) => ipcRenderer.on("agent-prompt-result", (_e, data) => cb(data)),
  testAgentCapture: () => ipcRenderer.invoke("test-agent-capture"),
});
