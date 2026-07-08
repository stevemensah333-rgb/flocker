const { contextBridge, ipcRenderer } = require("electron");

// Exposed to the offline fallback page so its "Try again" button and the
// automatic "online" listener can ask the main process to reload the app.
contextBridge.exposeInMainWorld("flockerReload", () => {
  ipcRenderer.send("flocker:reload-app");
});
