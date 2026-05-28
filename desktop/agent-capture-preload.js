const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("captureAPI", {
  onScreenshot: (cb) => ipcRenderer.on("capture-screenshot", (_e, url) => cb(url)),
  selectRegion: (bounds) => ipcRenderer.send("capture-select", bounds),
  cancel: () => ipcRenderer.send("capture-cancel"),
});
