const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#1C1C1C",
    title: "Flocker",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  win.loadFile(path.join(__dirname, "app", "index.html"));

  // Open external links in the system browser, keep app links in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

// ---- Auto update via GitHub Releases ----
function setupAutoUpdates() {
  // Don't check for updates in dev / unpackaged runs.
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update ready",
      message: `Flocker ${info.version} has been downloaded.`,
      detail: "Restart the app to apply the update.",
    });
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-update error:", err == null ? "unknown" : err.message);
  });

  autoUpdater.checkForUpdatesAndNotify();

  // Re-check every 6 hours while the app stays open.
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 6 * 60 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdates();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
