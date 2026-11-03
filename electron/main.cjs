const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow;
let serverHandle;

async function createWindow() {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  let url = devUrl;

  if (!url) {
    const dataDir = path.join(app.getPath('userData'), 'data');
    const serverPath = path.join(__dirname, '..', 'server', 'index.mjs');
    const { startServer } = await import(pathToFileURL(serverPath).href);
    serverHandle = await startServer({ host: '127.0.0.1', port: 0, dataDir, demoMode: false });
    url = `http://127.0.0.1:${serverHandle.port}`;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'BuildMűhely',
    backgroundColor: '#0b0f14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(url);
}

app.whenReady().then(createWindow).catch(err => {
  dialog.showErrorBox('BuildMűhely indítási hiba', err?.stack || String(err));
  app.quit();
});

app.on('window-all-closed', async () => {
  if (serverHandle) await serverHandle.close().catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
