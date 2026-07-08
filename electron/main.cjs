const {
  app,
  BrowserWindow,
  shell,
  dialog,
  ipcMain,
  nativeImage,
} = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");

// The full Flocker web app (all features: Dashboard, Coops, Ration Pro,
// Egg Ledger, Events, VetLine, Reports, etc.). Loading it here means the
// desktop app has feature parity with the web app. Features that need the
// network (VetLine and other AI tools, data sync) simply require the user
// to be online — exactly like Outlook, Teams and most desktop apps.
const APP_URL = process.env.FLOCKER_APP_URL || "https://flocker.lovable.app";

let mainWindow = null;
let splashWindow = null;
let appLoaded = false;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 460,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: "#0A140E",
    show: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.loadFile(path.join(__dirname, "app", "splash.html"));
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
  splashWindow = null;
}

function loadOffline() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, "app", "offline.html"));
}

function loadApp() {
  if (!mainWindow) return;
  mainWindow.loadURL(APP_URL);
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#0A140E",
    title: "Flocker",
    autoHideMenuBar: true,
    show: false, // stay hidden until the app (or offline page) is ready
    icon: nativeImage.createFromPath(path.join(__dirname, "assets", "logo.png")),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow = win;

  // Reveal the window (and dismiss the splash) once the first page is ready.
  win.webContents.on("did-finish-load", () => {
    appLoaded = true;
    closeSplash();
    if (!win.isVisible()) win.show();
  });

  // No connection / server unreachable -> show the branded offline screen.
  win.webContents.on("did-fail-load", (_e, errorCode, _desc, validatedURL) => {
    // -3 is ERR_ABORTED (e.g. an in-app redirect) — ignore it.
    if (errorCode === -3) return;
    // Only fall back when the main app URL fails, not the offline page itself.
    if (validatedURL && validatedURL.startsWith("file://")) return;
    closeSplash();
    if (!win.isVisible()) win.show();
    loadOffline();
  });

  // Open external links in the system browser, keep app navigation in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") && !url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  loadApp();

  // Safety net: never leave the splash up forever.
  setTimeout(() => {
    if (!appLoaded) {
      closeSplash();
      if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
    }
  }, 15000);
}

// Offline page asks to retry / auto-reconnects.
ipcMain.on("flocker:reload-app", () => {
  loadApp();
});

// ---- Auto update via GitHub Releases ----
function setupAutoUpdates() {
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
    if (result.response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-update error:", err == null ? "unknown" : err.message);
  });

  autoUpdater.checkForUpdatesAndNotify();
  setInterval(
    () => autoUpdater.checkForUpdatesAndNotify(),
    6 * 60 * 60 * 1000,
  );
}

app.whenReady().then(() => {
  createSplash();
  createMainWindow();
  setupAutoUpdates();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplash();
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
