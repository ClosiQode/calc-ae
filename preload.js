const { contextBridge, ipcRenderer } = require('electron');

// API sécurisée pour les réglages persistants et l'ouverture de la fenêtre options
contextBridge.exposeInMainWorld('settings', {
  get: () => ipcRenderer.invoke('settings:get'),
  set: (partial) => ipcRenderer.invoke('settings:set', partial),
  onUpdated: (cb) => {
    const listener = (_evt, payload) => { try { cb(payload); } catch (_) {} };
    ipcRenderer.on('settings:updated', listener);
    return () => ipcRenderer.off('settings:updated', listener);
  },
  openOptions: () => ipcRenderer.invoke('options:open'),
});

// API export (HTML/PDF)
contextBridge.exposeInMainWorld('exporter', {
  toHTML: (html) => ipcRenderer.invoke('export:html', { html }),
  toPDF: (html) => ipcRenderer.invoke('export:pdf', { html }),
});

// Rien d'autre n'est exposé
