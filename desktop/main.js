const {
  app, BrowserWindow, Menu, shell, ipcMain,
  Tray, globalShortcut, desktopCapturer, screen,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");

const SITE_URL = "https://ausverseai.com";

let mainWindow = null;
let tray = null;
let agentOverlay = null;
let captureWindow = null;
let capturedScreenshot = null;
let updateReady = null;
let agentPromptAttempted = false;

// ── Agent Settings (persisted to disk) ───────────────────

const SETTINGS_PATH = path.join(app.getPath("userData"), "agent-settings.json");
const DEFAULT_SETTINGS = {
  enabled: false,
  shortcut: "CommandOrControl+Shift+A",
  promptShown: false, // first-login prompt
};

function loadAgentSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveAgentSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function applyAgentShortcut() {
  globalShortcut.unregisterAll();

  const settings = loadAgentSettings();
  if (!settings.enabled) {
    console.log("Agent disabled — no shortcut registered");
    return;
  }

  const shortcut = settings.shortcut || DEFAULT_SETTINGS.shortcut;
  try {
    const ok = globalShortcut.register(shortcut, captureAndAnalyse);
    if (ok) {
      console.log("Agent shortcut registered:", shortcut);
    } else {
      console.error("Agent shortcut already taken by another app:", shortcut);
      // Retry once after a short delay (sometimes OS needs a moment)
      setTimeout(() => {
        try {
          globalShortcut.unregisterAll();
          const retry = globalShortcut.register(shortcut, captureAndAnalyse);
          console.log(retry ? "Agent shortcut registered on retry:" : "Agent shortcut still failed:", shortcut);
        } catch (e) {
          console.error("Agent shortcut retry error:", e.message);
        }
      }, 500);
    }
  } catch (err) {
    console.error("Failed to register agent shortcut:", err.message);
  }
}

// ── Auto-updater ──────────────────────────────────────────

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-available", (info) => {
  console.log(`Update available: v${info.version}`);
});

autoUpdater.on("update-downloaded", (info) => {
  updateReady = info.version;
  injectUpdateIcon();
});

autoUpdater.on("error", (err) => {
  console.error("Update error:", err.message);
});

function injectUpdateIcon() {
  if (!mainWindow || !updateReady) return;
  const ver = updateReady;
  mainWindow.webContents.executeJavaScript(`
    (function() {
      if (document.getElementById('av-update-icon')) return;

      /* Pulse animation */
      if (!document.getElementById('av-update-style')) {
        var s = document.createElement('style');
        s.id = 'av-update-style';
        s.textContent = '@keyframes avPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.35)}50%{box-shadow:0 0 0 5px rgba(34,197,94,0)}}';
        document.head.appendChild(s);
      }

      var btn = document.createElement('button');
      btn.id = 'av-update-icon';
      btn.title = 'Update v${ver} ready — click to install & restart';
      btn.style.cssText = '-webkit-app-region:no-drag;position:fixed;top:10px;right:150px;z-index:99999;width:28px;height:28px;border-radius:7px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer;animation:avPulse 2s ease-in-out infinite;transition:background 0.15s ease;';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2v8m0 0l-3-3m3 3l3-3" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 13h10" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round"/></svg>';
      btn.onmouseenter = function() { this.style.background = 'rgba(34,197,94,0.2)'; };
      btn.onmouseleave = function() { this.style.background = 'rgba(34,197,94,0.1)'; };
      btn.onclick = function() { window.electronAPI.installUpdate(); };
      document.body.appendChild(btn);
    })();
  `);
}

// ── Titlebar CSS ──────────────────────────────────────────

const TITLEBAR_CSS = `
  [data-titlebar] {
    -webkit-app-region: drag;
  }
  [data-titlebar] button,
  [data-titlebar] a,
  [data-titlebar] input,
  [data-titlebar] select,
  [data-titlebar] [role="button"],
  [data-titlebar] svg {
    -webkit-app-region: no-drag;
  }
  .titlebar-pad {
    padding-right: 140px;
  }
`;

// ── System Tray ──────────────────────────────────────────

function createTray() {
  tray = new Tray(path.join(__dirname, "icon.ico"));
  tray.setToolTip("Ausverse AI");
  updateTrayMenu();
  tray.on("click", () => showMainWindow());
}

function updateTrayMenu() {
  if (!tray) return;
  const settings = loadAgentSettings();
  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Ausverse AI", click: () => showMainWindow() },
    { type: "separator" },
    ...(settings.enabled ? [{
      label: "Analyse Screen",
      accelerator: (settings.shortcut || DEFAULT_SETTINGS.shortcut).replace("CommandOrControl", "CmdOrCtrl"),
      click: () => captureAndAnalyse(),
    }] : [{
      label: "Agent Disabled",
      enabled: false,
    }]),
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ── Agent Mode ───────────────────────────────────────────

async function captureAndAnalyse() {
  // Close any existing capture/overlay windows
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.destroy();
    captureWindow = null;
  }
  if (agentOverlay && !agentOverlay.isDestroyed()) {
    agentOverlay.destroy();
    agentOverlay = null;
  }

  try {
    // 1. Grab the full screen BEFORE showing any overlay
    const display = screen.getPrimaryDisplay();
    const { width, height } = display.size;
    const sf = display.scaleFactor || 1;

    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: Math.round(width * sf), height: Math.round(height * sf) },
    });

    if (sources.length === 0) return;
    capturedScreenshot = sources[0].thumbnail;

    // 2. Show fullscreen selection overlay
    const { bounds } = display;
    captureWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      fullscreen: true,
      hasShadow: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "agent-capture-preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    captureWindow.loadFile(path.join(__dirname, "agent-capture.html"));

    captureWindow.once("ready-to-show", () => {
      captureWindow.show();
      captureWindow.focus();
      // Send the screenshot to the capture window
      const dataUrl = `data:image/png;base64,${capturedScreenshot.toPNG().toString("base64")}`;
      captureWindow.webContents.send("capture-screenshot", dataUrl);
    });

    captureWindow.on("closed", () => {
      captureWindow = null;
    });
  } catch (err) {
    console.error("Agent capture error:", err);
  }
}

// Called when user finishes dragging a selection
async function analyseRegion(bounds) {
  // Close the capture window
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.destroy();
    captureWindow = null;
  }

  if (!capturedScreenshot) return;

  try {
    // Crop the screenshot to the selected region
    const cropped = capturedScreenshot.crop({
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: bounds.h,
    });

    const base64 = `data:image/png;base64,${cropped.toPNG().toString("base64")}`;

    // Show the analysis overlay
    showAgentOverlay();

    // Get auth cookies
    const session = mainWindow
      ? mainWindow.webContents.session
      : require("electron").session.defaultSession;

    const cookies = await session.cookies.get({ url: SITE_URL });
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Call the API
    const res = await fetch(`${SITE_URL}/api/v1/agent/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStr,
      },
      body: JSON.stringify({ image: base64 }),
    });

    if (!res.ok) {
      console.error("Agent API error:", res.status);
      sendToOverlay("agent-error", res.status === 401
        ? "Not logged in — open Ausverse AI and sign in first."
        : "Analysis failed.");
      return;
    }

    const data = await res.json();
    sendToOverlay("agent-result", data.text || "No analysis returned.");
  } catch (err) {
    console.error("Agent analyse error:", err);
    sendToOverlay("agent-error", "Failed to analyse selection.");
  }
}

function showAgentOverlay() {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const ow = 380;
  const oh = 220;

  agentOverlay = new BrowserWindow({
    width: ow,
    height: oh,
    x: sw - ow - 20,
    y: sh - oh - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "agent-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  agentOverlay.loadFile(path.join(__dirname, "agent-overlay.html"));

  agentOverlay.once("ready-to-show", () => {
    agentOverlay.show();
  });

  agentOverlay.on("blur", () => {
    // Close when clicking outside
    if (agentOverlay && !agentOverlay.isDestroyed()) {
      agentOverlay.destroy();
      agentOverlay = null;
    }
  });

  agentOverlay.on("closed", () => {
    agentOverlay = null;
  });
}

function sendToOverlay(channel, data) {
  if (agentOverlay && !agentOverlay.isDestroyed()) {
    agentOverlay.webContents.send(channel, data);

    // Auto-resize height based on content
    agentOverlay.webContents.executeJavaScript(`
      document.querySelector('.card').offsetHeight
    `).then((h) => {
      if (agentOverlay && !agentOverlay.isDestroyed()) {
        const newH = Math.min(Math.max(h + 4, 120), 400);
        const [x] = agentOverlay.getPosition();
        const display = require("electron").screen.getPrimaryDisplay();
        const sy = display.workAreaSize.height;
        agentOverlay.setBounds({
          x,
          y: sy - newH - 20,
          width: 380,
          height: newH,
        });
      }
    }).catch(() => {});
  }
}

// ── Window ────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: "Ausverse AI",
    icon: path.join(__dirname, "icon.ico"),
    backgroundColor: "#09090b",
    show: false,
    autoHideMenuBar: true,

    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "rgba(12, 12, 18, 0.01)",
      symbolColor: "#888888",
      height: 48,
    },

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.insertCSS(TITLEBAR_CSS);
    if (updateReady) injectUpdateIcon();
    showAgentPromptIfNeeded();
  });

  mainWindow.loadURL(SITE_URL);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(SITE_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── First-login Agent Prompt ─────────────────────────────

function showAgentPromptIfNeeded() {
  const settings = loadAgentSettings();
  if (settings.promptShown || !mainWindow || agentPromptAttempted) return;

  // Skip auth pages — wait until user is on a real page
  const url = mainWindow.webContents.getURL();
  try {
    const path = new URL(url).pathname;
    if (path === "/login" || path === "/signup" || path.startsWith("/error")) return;
  } catch { return; }

  // Only attempt once per app session
  agentPromptAttempted = true;

  // Verify the user is actually logged in before showing the prompt
  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.executeJavaScript(`
      (function() {
        if (document.getElementById('av-agent-prompt')) return;

        fetch('/api/v1/session/auth').then(function(r) { return r.json(); }).then(function(d) {
          if (!d.loggedIn) return;
          if (document.getElementById('av-agent-prompt')) return;

          var overlay = document.createElement('div');
          overlay.id = 'av-agent-prompt';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:ctxIn 200ms ease-out;';

          overlay.innerHTML = '<div style="width:380px;background:rgba(12,12,18,0.95);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.6);text-align:center;">'
            + '<div style="width:44px;height:44px;border-radius:11px;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:12px;font-weight:700;color:#f87171;letter-spacing:0.5px;">Av</div>'
            + '<h2 style="font-size:16px;font-weight:600;color:#f5f5f5;margin:0 0 6px;letter-spacing:-0.3px;">AIA Agent</h2>'
            + '<p style="font-size:12px;color:#71717a;line-height:1.6;margin:0 0 20px;">A background intelligence agent that runs on your desktop. Press <kbd style=\\'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:3px;padding:1px 6px;font-size:11px;color:#a1a1aa;font-family:inherit;\\'>Ctrl+Shift+A</kbd> anywhere to screenshot and analyse anything on screen with AI.</p>'
            + '<div style="display:flex;gap:8px;justify-content:center;">'
            + '<button id="av-agent-skip" style="font-size:12px;font-weight:500;color:#71717a;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:8px 20px;cursor:pointer;font-family:inherit;transition:all 0.15s;">Not now</button>'
            + '<button id="av-agent-enable" style="font-size:12px;font-weight:600;color:#fff;background:#dc2626;border:1px solid rgba(220,38,38,0.5);border-radius:7px;padding:8px 20px;cursor:pointer;font-family:inherit;transition:all 0.15s;">Enable Agent</button>'
            + '</div>'
            + '<p style="font-size:10px;color:#52525b;margin-top:14px;">You can change this later in Settings \\u2192 Agent</p>'
            + '</div>';

          document.body.appendChild(overlay);

          document.getElementById('av-agent-enable').onclick = function() {
            overlay.remove();
            window.electronAPI.dismissAgentPrompt(true);
          };
          document.getElementById('av-agent-skip').onclick = function() {
            overlay.remove();
            window.electronAPI.dismissAgentPrompt(false);
          };
        }).catch(function() {});
      })();
    `);
  }, 2000);
}

// ── App lifecycle ─────────────────────────────────────────

app.on("ready", () => {
  createWindow();
  createTray();

  // Apply agent shortcut if enabled
  applyAgentShortcut();

  // IPC: install update
  ipcMain.on("install-update", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // IPC: check for updates (settings page)
  ipcMain.handle("check-for-updates", () => {
    return new Promise((resolve) => {
      const cleanup = () => {
        autoUpdater.removeListener("update-available", onAvailable);
        autoUpdater.removeListener("update-not-available", onNotAvailable);
        autoUpdater.removeListener("error", onError);
      };
      const onAvailable = (info) => { cleanup(); resolve({ status: "available", version: info.version }); };
      const onNotAvailable = () => { cleanup(); resolve({ status: "up-to-date" }); };
      const onError = (err) => { cleanup(); resolve({ status: "error", message: err.message }); };

      autoUpdater.once("update-available", onAvailable);
      autoUpdater.once("update-not-available", onNotAvailable);
      autoUpdater.once("error", onError);
      autoUpdater.checkForUpdates().catch((err) => { cleanup(); resolve({ status: "error", message: err.message }); });
    });
  });

  // IPC: agent settings
  ipcMain.handle("get-agent-settings", () => {
    return loadAgentSettings();
  });

  ipcMain.handle("set-agent-settings", (_e, patch) => {
    const current = loadAgentSettings();
    const updated = { ...current, ...patch };
    saveAgentSettings(updated);
    applyAgentShortcut();
    updateTrayMenu();
    return updated;
  });

  // IPC: first-login agent prompt response
  ipcMain.on("dismiss-agent-prompt", (_e, enabled) => {
    const settings = loadAgentSettings();
    settings.promptShown = true;
    settings.enabled = enabled;
    saveAgentSettings(settings);
    applyAgentShortcut();
    updateTrayMenu();
  });

  // IPC: close agent overlay
  ipcMain.on("close-agent-overlay", () => {
    if (agentOverlay && !agentOverlay.isDestroyed()) {
      agentOverlay.destroy();
      agentOverlay = null;
    }
  });

  // IPC: capture selection completed
  ipcMain.on("capture-select", (_e, bounds) => {
    analyseRegion(bounds);
  });

  // IPC: capture cancelled
  ipcMain.on("capture-cancel", () => {
    if (captureWindow && !captureWindow.isDestroyed()) {
      captureWindow.destroy();
      captureWindow = null;
    }
    capturedScreenshot = null;
  });

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 3000);
});

app.on("window-all-closed", () => {
  // Don't quit — keep running in tray
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
