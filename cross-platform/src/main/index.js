import { app, BrowserWindow, ipcMain, safeStorage, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePaths } from './paths.js';
import { Store, createCryptoAdapter } from './store.js';
import { scanCodexUsage } from './usage-scanner.js';
import { ConfigManager } from './config-manager.js';
import { LocalProxy } from './proxy.js';

const here = path.dirname(fileURLToPath(import.meta.url));
let win; let tray; let store; let proxy; let configs; let paths;

function createWindow() {
  win = new BrowserWindow({ width: 1160, height: 760, minWidth: 900, minHeight: 600, title: 'AIUsage',
    backgroundColor: '#07111f', webPreferences: { preload: path.join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile(path.join(here, '..', 'renderer', 'index.html'));
}

function createTray() {
  const icon = nativeImage.createFromDataURL('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiByeD0iNiIgZmlsbD0iIzYzNjZmMSIvPjxwYXRoIGQ9Ik03IDE3bDQtMTAgMyA2IDMtMyIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+');
  tray = new Tray(icon.resize({ width: 18, height: 18 }));
  tray.setToolTip('AIUsage'); tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open AIUsage', click: () => { win.show(); win.focus(); } },
    { label: 'Quit', click: () => app.quit() }
  ])); tray.on('double-click', () => win.show());
}

app.whenReady().then(async () => {
  paths = resolvePaths(); store = new Store(paths.appStore, createCryptoAdapter(safeStorage));
  proxy = new LocalProxy(() => store.activeNodeWithKey());
  configs = new ConfigManager(paths, () => store.load().proxyPort);
  await proxy.start(store.load().proxyPort);
  createWindow(); createTray(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform === 'darwin') return; });
app.on('before-quit', () => proxy?.stop());

ipcMain.handle('state:get', () => store.publicState());
ipcMain.handle('node:save', (_e, node) => store.upsertNode(node));
ipcMain.handle('node:delete', (_e, id) => store.deleteNode(id));
ipcMain.handle('node:activate', (_e, id) => store.setActive(id));
ipcMain.handle('usage:scan', () => scanCodexUsage(paths.codexSessionRoots));
ipcMain.handle('config:status', () => configs.status());
ipcMain.handle('config:activate', (_e, target) => configs.activate(target));
ipcMain.handle('config:deactivate', (_e, target) => configs.deactivate(target));
ipcMain.handle('proxy:status', () => ({ running: Boolean(proxy.server), port: proxy.port, activeNode: store.publicState().activeNodeId }));
