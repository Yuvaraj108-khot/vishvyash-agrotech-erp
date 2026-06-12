/**
 * Electron Preload Script — Secure bridge between main and renderer
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
