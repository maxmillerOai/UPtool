/* eslint-disable */
// Electron main process: starts the bundled Node backend (which also serves the
// built React UI) and opens a desktop window pointed at it.
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const http = require("node:http");

const PORT = Number(process.env.PORT || 8792);
let backendProc = null;
let mainWindow = null;

// Running as root on Linux (e.g. CI/containers) requires disabling the sandbox.
if (process.platform === "linux") {
  app.commandLine.appendSwitch("no-sandbox");
}

function appBase() {
  // With asar disabled, packaged files live under resources/app.
  return app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
}

function startBackend() {
  const base = appBase();
  const serverEntry = path.join(base, "backend", "server.mjs");
  const staticDir = path.join(base, "dist");
  backendProc = spawn(process.execPath, [serverEntry], {
    cwd: path.join(base, "backend"),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT),
      HPB_STATIC_DIR: staticDir,
    },
    stdio: "inherit",
  });
  backendProc.on("error", (err) => console.error("[backend] failed to start:", err));
}

function waitForServer(onReady, attempt = 0) {
  const req = http.get(`http://localhost:${PORT}/api/settings`, (res) => {
    res.resume();
    onReady();
  });
  req.on("error", () => {
    if (attempt < 100) setTimeout(() => waitForServer(onReady, attempt + 1), 150);
    else onReady();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#080c14",
    autoHideMenuBar: true,
    title: "Host Post Builder",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open external links (e.g. host URLs) in the default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  waitForServer(createWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (backendProc) {
    try {
      backendProc.kill();
    } catch {
      /* ignore */
    }
  }
  app.quit();
});

app.on("before-quit", () => {
  if (backendProc) {
    try {
      backendProc.kill();
    } catch {
      /* ignore */
    }
  }
});
