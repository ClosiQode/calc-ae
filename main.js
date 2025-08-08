const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const UpdateManager = require('./updater');

// -------- Settings (persistants) --------
const DEFAULT_SETTINGS = {
  roundMode: 'none', // none | floor | ceil | nearest
  includeVL: false,
  rates: {
    VENTES: { social: 12.3, vl: 1.0, cfp: 0.10, cci: 0.02 },
    BIC:    { social: 21.2, vl: 1.7, cfp: 0.10, cci: 0.04 },
    BNC:    { social: 24.6, vl: 2.2, cfp: 0.10, cci: 0 },
  }
};

let optionsWin = null;
let mainWin = null;
let updateManager = null;
let settingsPath = null; // chemin du fichier de réglages persistants

function getIconPath() {
  try {
    const res = process.resourcesPath || __dirname;
    if (process.platform === 'win32') {
      const p = path.join(res, 'build', 'icons', 'icon.ico');
      return fs.existsSync(p) ? p : path.join(__dirname, 'logo.jpeg');
    }
    if (process.platform === 'darwin') {
      const p = path.join(res, 'build', 'icons', 'icon.icns');
      return fs.existsSync(p) ? p : path.join(__dirname, 'logo.jpeg');
    }
    // linux: use a large PNG
    const p = path.join(res, 'build', 'icons', 'png', 'icon_512x512.png');
    return fs.existsSync(p) ? p : path.join(__dirname, 'logo.jpeg');
  } catch {
    return path.join(__dirname, 'logo.jpeg');
  }
}

function getSettingsPath() {
  if (!settingsPath) settingsPath = path.join(app.getPath('userData'), 'settings.json');
  return settingsPath;
}

function readSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      try {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed, rates: { ...DEFAULT_SETTINGS.rates, ...(parsed.rates||{}) } };
      } catch (e) {
        console.error('Settings JSON invalide, réinitialisation aux valeurs par défaut:', e);
      }
    }
  } catch (e) {
    console.error('Erreur lecture réglages:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

function writeSettings(newSettings) {
  try {
    const p = getSettingsPath();
    const merged = { ...DEFAULT_SETTINGS, ...newSettings, rates: { ...DEFAULT_SETTINGS.rates, ...(newSettings.rates||{}) } };
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (e) {
    console.error('Erreur écriture réglages:', e);
    // Retourne tout de même l’objet demandé pour ne pas bloquer l’UI
    return { ...DEFAULT_SETTINGS, ...newSettings, rates: { ...DEFAULT_SETTINGS.rates, ...(newSettings.rates||{}) } };
  }
}

function createMainWindow() {
  // Nom d'application global et identité Windows
  try { app.setName('Calc AE'); } catch (_) {}
  try { app.setAppUserModelId('com.calc.ae'); } catch (_) {}

  const win = new BrowserWindow({
    width: 1100,
    height: 940,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#0f172a',
    title: 'Calc AE',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    }
  });

  win.loadFile(path.join(__dirname, 'index.html'));
  mainWin = win;

  // Connect updater when main window exists (seulement en production)
  try {
    if (app.isPackaged) {
      if (!updateManager) updateManager = new UpdateManager();
      updateManager.setWindows(mainWin);
    }
  } catch (e) { console.error('Updater init error:', e); }

  if (process.env.ELECTRON_START_URL) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
  return mainWin;
}

function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { role: 'quit', label: 'Quitter' },
      ]
    },
    {
      label: 'Mise à jour',
      submenu: [
        {
          label: 'Rechercher des mises à jour…',
          click: () => { try { updateManager && updateManager.checkForUpdatesNow(); } catch (e) { console.error(e); } }
        }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Ouvrir le site GitHub',
          click: () => shell.openExternal('https://github.com/ClosiQode/calc-ae')
        },
        {
          label: 'Signaler un problème…',
          click: () => shell.openExternal('https://github.com/ClosiQode/calc-ae/issues')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createOptionsWindow() {
  if (optionsWin && !optionsWin.isDestroyed()) {
    optionsWin.focus();
    return optionsWin;
  }
  optionsWin = new BrowserWindow({
    width: 720,
    height: 760,
    resizable: true,
    backgroundColor: '#0f172a',
    title: 'Calc AE – Options',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    }
  });
  optionsWin.loadFile(path.join(__dirname, 'options.html'));
  optionsWin.on('closed', () => { optionsWin = null; });
  return optionsWin;
}

app.whenReady().then(async () => {
  // Initialiser l’updater et bloquer le démarrage tant que la décision n’est pas prise
  const updatesEnabled = String(process.env.CALCAE_UPDATES || 'on').toLowerCase() !== 'off';
  if (app.isPackaged && updatesEnabled) {
    try {
      if (!updateManager) updateManager = new UpdateManager();
      // Pas de fenêtre encore: le dialog utilise la fenêtre principale si dispo, sinon il sera modal global.
      await updateManager.checkBeforeStart();
    } catch (e) {
      console.error('Erreur gating MAJ au démarrage:', e);
    }
  }

  // Une fois OK → créer la fenêtre et le menu
  createMainWindow();
  createMenu();
  // En complément, on garde la vérification décalée si jamais désactivée ci-dessus
  if (app.isPackaged && updatesEnabled) {
    setTimeout(() => { try { updateManager && updateManager.checkForUpdatesOnStartup(); } catch (e) { console.error(e); } }, 5000);
  }
  // IPC settings
  ipcMain.handle('settings:get', () => readSettings());
  ipcMain.handle('settings:set', (evt, partial) => {
    const current = readSettings();
    const merged = writeSettings({ ...current, ...partial, rates: { ...current.rates, ...(partial.rates||{}) } });
    // Broadcast update to all windows
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('settings:updated', merged));
    return merged;
  });
  ipcMain.handle('options:open', () => {
    createOptionsWindow();
    return true;
  });

  // Export HTML: save provided HTML to file chosen by user
  ipcMain.handle('export:html', async (_evt, { html }) => {
    const { dialog } = require('electron');
    const res = await dialog.showSaveDialog({
      title: 'Enregistrer le rapport HTML',
      defaultPath: 'resultats.html',
      filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
    });
    if (res.canceled || !res.filePath) return false;
    fs.writeFileSync(res.filePath, String(html ?? ''), 'utf8');
    return true;
  });

  // Export PDF: render provided HTML dans une fenêtre offscreen et générer un PDF
  ipcMain.handle('export:pdf', async (_evt, { html }) => {
    const { dialog } = require('electron');
    const res = await dialog.showSaveDialog({
      title: 'Enregistrer le rapport PDF',
      defaultPath: 'resultats.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (res.canceled || !res.filePath) return false;

    const off = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: true }
    });
    const content = String(html ?? '');
    await off.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(content));
    const pdf = await off.webContents.printToPDF({ printBackground: true, marginsType: 1 });
    fs.writeFileSync(res.filePath, pdf);
    off.destroy();
    return true;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
