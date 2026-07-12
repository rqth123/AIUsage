const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aiusage', {
  state: () => ipcRenderer.invoke('state:get'),
  saveNode: node => ipcRenderer.invoke('node:save', node),
  deleteNode: id => ipcRenderer.invoke('node:delete', id),
  activateNode: id => ipcRenderer.invoke('node:activate', id),
  usage: () => ipcRenderer.invoke('usage:scan'),
  configStatus: () => ipcRenderer.invoke('config:status'),
  configActivate: target => ipcRenderer.invoke('config:activate', target),
  configDeactivate: target => ipcRenderer.invoke('config:deactivate', target),
  proxyStatus: () => ipcRenderer.invoke('proxy:status')
});
