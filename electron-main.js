const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "LocalThesis",
    icon: path.join(__dirname, 'icon.svg'), // Electron builder will auto-convert for Win/Mac
    webPreferences: {
      nodeIntegration: false, // Security: Keep true isolation
      contextIsolation: true,
      webSecurity: false // Allow loading local resources and mixed content (esm.sh) easier in this prototype
    }
  });

  // Load the index.html of the app.
  win.loadFile('index.html');

  // Open external links in default browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Remove the default menu bar for a cleaner "Zen" look
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});