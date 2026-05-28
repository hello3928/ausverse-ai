const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agentAPI", {
  onResult: (cb) => ipcRenderer.on("agent-result", (_e, text) => cb(text)),
  onError: (cb) => ipcRenderer.on("agent-error", (_e, msg) => cb(msg)),
  sendMessage: (text) => ipcRenderer.send("agent-send-message", text),
  onFollowUp: (cb) => ipcRenderer.on("agent-followup", (_e, text) => cb(text)),
  onFollowUpError: (cb) => ipcRenderer.on("agent-followup-error", (_e, msg) => cb(msg)),
  close: () => ipcRenderer.send("close-agent-overlay"),
});
