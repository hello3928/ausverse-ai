const {
  app, BrowserWindow, Menu, shell, ipcMain,
  Tray, globalShortcut, desktopCapturer, screen, dialog,
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

// Agent conversation state (persists while overlay is open)
let agentImageBase64 = null;   // the screenshot being discussed
let agentConversation = [];    // [{role, content}] history for multi-turn
let agentCookieStr = "";       // cached auth cookies

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
    return "disabled";
  }

  const shortcut = settings.shortcut || DEFAULT_SETTINGS.shortcut;
  try {
    const ok = globalShortcut.register(shortcut, captureAndAnalyse);
    console.log(ok ? `Agent shortcut registered: ${shortcut}` : `Agent shortcut failed: ${shortcut}`);
    return ok ? "ok" : "taken";
  } catch (err) {
    console.error("Failed to register agent shortcut:", err.message);
    return "error";
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1); // clear progress bar
  }
  injectUpdateIcon();
});

autoUpdater.on("download-progress", (progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(progress.percent / 100);
  }
});

autoUpdater.on("error", (err) => {
  console.error("Update error:", err.message);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1); // clear progress bar
  }
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

    // Reset conversation state for this new capture
    agentImageBase64 = base64;
    agentConversation = [];

    // Show the analysis overlay
    showAgentOverlay();

    // Get auth cookies (cache for follow-ups)
    const session = mainWindow
      ? mainWindow.webContents.session
      : require("electron").session.defaultSession;

    const cookies = await session.cookies.get({ url: SITE_URL });
    agentCookieStr = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    // Call the API for initial analysis
    const res = await fetch(`${SITE_URL}/api/v1/agent/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookieStr,
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
    const text = data.text || "No analysis returned.";

    // Store in conversation history
    agentConversation.push(
      { role: "user", content: [
        { type: "image_url", image_url: { url: base64 } },
        { type: "text", text: "Analyse this screenshot." },
      ]},
      { role: "assistant", content: text },
    );

    sendToOverlay("agent-result", text);
  } catch (err) {
    console.error("Agent analyse error:", err);
    sendToOverlay("agent-error", "Failed to analyse selection.");
  }
}

// Called when user sends a follow-up message in the overlay
async function handleFollowUp(userText) {
  if (!agentImageBase64 || !agentCookieStr) {
    sendToOverlay("agent-followup-error", "No active capture session.");
    return;
  }

  try {
    // Add user message to conversation
    agentConversation.push({ role: "user", content: userText });

    const res = await fetch(`${SITE_URL}/api/v1/agent/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookieStr,
      },
      body: JSON.stringify({
        image: agentImageBase64,
        messages: agentConversation,
      }),
    });

    if (!res.ok) {
      console.error("Agent follow-up error:", res.status);
      // Remove the failed user message
      agentConversation.pop();
      sendToOverlay("agent-followup-error", "Failed to get response.");
      return;
    }

    const data = await res.json();
    const text = data.text || "No response.";

    // Store assistant reply
    agentConversation.push({ role: "assistant", content: text });

    sendToOverlay("agent-followup", text);
  } catch (err) {
    console.error("Agent follow-up error:", err);
    agentConversation.pop();
    sendToOverlay("agent-followup-error", "Failed to get response.");
  }
}

function showAgentOverlay() {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const ow = 400;
  const oh = 320;

  agentOverlay = new BrowserWindow({
    width: ow,
    height: oh,
    x: sw - ow - 20,
    y: sh - oh - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    minWidth: 320,
    minHeight: 200,
    maxWidth: 600,
    maxHeight: 600,
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

  agentOverlay.on("closed", () => {
    agentOverlay = null;
    // Clear conversation when overlay is closed
    agentImageBase64 = null;
    agentConversation = [];
    agentCookieStr = "";
  });
}

function sendToOverlay(channel, data) {
  if (agentOverlay && !agentOverlay.isDestroyed()) {
    agentOverlay.webContents.send(channel, data);
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

  // Ctrl+Shift+D to open DevTools
  mainWindow.webContents.on("before-input-event", (_e, input) => {
    if (input.control && input.shift && input.key === "D") {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.insertCSS(TITLEBAR_CSS);
    if (updateReady) injectUpdateIcon();
    showAgentPromptIfNeeded();
  });

  // SPA navigations (Next.js client-side routing after login)
  mainWindow.webContents.on("did-navigate-in-page", () => {
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

async function showAgentPromptIfNeeded() {
  const settings = loadAgentSettings();
  if (settings.promptShown || !mainWindow) return;

  // Verify the user is actually logged in before showing the prompt
  await new Promise((r) => setTimeout(r, 2000));
  if (!mainWindow || mainWindow.isDestroyed()) return;

  let loggedIn = false;
  try {
    loggedIn = await mainWindow.webContents.executeJavaScript(
      `fetch('/api/v1/session/auth').then(r => r.json()).then(d => !!d.loggedIn).catch(() => false)`
    );
  } catch { /* ignore */ }

  if (!loggedIn || !mainWindow || mainWindow.isDestroyed()) return;

  const shortcut = settings.shortcut || DEFAULT_SETTINGS.shortcut;
  const result = await dialog.showMessageBox(mainWindow, {
    type: "question",
    title: "AIA Agent",
    message: "Enable the AIA Agent?",
    detail: `A background intelligence agent that runs on your desktop. Press ${shortcut} anywhere to screenshot and analyse anything on screen with AI.\n\nYou can change this later in Settings → Agent.`,
    buttons: ["Enable Agent", "Not now"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  const enabled = result.response === 0;
  settings.promptShown = true;
  settings.enabled = enabled;
  saveAgentSettings(settings);
  const shortcutStatus = applyAgentShortcut();
  updateTrayMenu();
  console.log("agent-prompt:", { enabled, shortcutStatus });
}

// ── Single instance lock ─────────────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to open a second instance — focus the existing window
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ── App lifecycle ─────────────────────────────────────────

app.on("ready", () => {
  createWindow();
  createTray();

  // Apply agent shortcut if enabled
  applyAgentShortcut();

  // IPC: install update — show progress then restart
  ipcMain.on("install-update", () => {
    // Show a dialog so the user knows what's happening
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog.showMessageBox(mainWindow, {
        type: "info",
        title: "Installing Update",
        message: "Installing update...",
        detail: "The app will restart in a moment.",
        buttons: ["OK"],
        noLink: true,
      }).then(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    } else {
      autoUpdater.quitAndInstall(false, true);
    }
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
    const shortcutStatus = applyAgentShortcut();
    updateTrayMenu();
    return { ...updated, shortcutStatus };
  });

// IPC: test agent capture (triggered from settings page)
  ipcMain.handle("test-agent-capture", async () => {
    try {
      const isRegistered = globalShortcut.isRegistered(
        loadAgentSettings().shortcut || DEFAULT_SETTINGS.shortcut
      );
      console.log("Test capture — shortcut registered:", isRegistered);
      await captureAndAnalyse();
      return { status: "ok", shortcutRegistered: isRegistered };
    } catch (err) {
      console.error("Test capture error:", err);
      return { status: "error", message: err.message };
    }
  });

  // IPC: close agent overlay
  ipcMain.on("close-agent-overlay", () => {
    if (agentOverlay && !agentOverlay.isDestroyed()) {
      agentOverlay.destroy();
      agentOverlay = null;
    }
  });

  // IPC: follow-up message from agent overlay
  ipcMain.on("agent-send-message", (_e, text) => {
    handleFollowUp(text);
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
