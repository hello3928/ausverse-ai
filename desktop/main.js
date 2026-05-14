const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const SITE_URL = "https://ausverseai.com";

let mainWindow = null;

// Minimal CSS for frameless window drag regions
const TITLEBAR_CSS = `
  /* Headers with data-titlebar become drag regions */
  [data-titlebar] {
    -webkit-app-region: drag;
  }

  /* Interactive elements inside must remain clickable */
  [data-titlebar] button,
  [data-titlebar] a,
  [data-titlebar] input,
  [data-titlebar] select,
  [data-titlebar] [role="button"],
  [data-titlebar] svg {
    -webkit-app-region: no-drag;
  }

  /* Right padding for window controls overlay */
  .titlebar-pad {
    padding-right: 140px;
  }
`;

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

    // Frameless with native window controls overlay
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

  // Inject titlebar CSS on every navigation
  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.insertCSS(TITLEBAR_CSS);
  });

  mainWindow.loadURL(SITE_URL);

  // Open external links in system browser
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
