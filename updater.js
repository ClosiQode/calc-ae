const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');
const dns = require('dns');

class UpdateManager {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.autoInstallAfterDownload = false;

    // Logger
    autoUpdater.logger = console;

    // In dev, allow testing updates
    if (process.env.NODE_ENV === 'development') {
      try { autoUpdater.forceDevUpdateConfig = true; } catch (_) {}
      try { app.isPackaged = true; } catch (_) {}
    }

    // If publish is configured in package.json, setFeedURL is optional.
    // You can force it by uncommenting below and replacing owner/repo if needed.
    // autoUpdater.setFeedURL({ provider: 'github', owner: 'ClosiQode', repo: 'kalk-ae', private: true });

    this._bindEvents();
  }

  setWindows(mainWindow) {
    this.mainWindow = mainWindow;
  }

  _send(channel, payload) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, payload);
    }
  }

  _bindEvents() {
    autoUpdater.on('checking-for-update', () => {
      console.log('🔎 Vérification des mises à jour…');
      this._send('update:checking', {});
    });

    autoUpdater.on('update-available', async (info) => {
      console.log('📥 Mise à jour disponible:', info);
      this.updateAvailable = true;
      this._send('update:available', info);

      // Demander confirmation à l'utilisateur
      try {
        const mw = this.mainWindow || null;
        const detail = `Version actuelle: ${app.getVersion()}\nVersion disponible: ${info && info.version ? info.version : ''}`;
        const res = await dialog.showMessageBox(mw, {
          type: 'question',
          buttons: ['Mettre à jour maintenant', 'Plus tard'],
          defaultId: 0,
          cancelId: 1,
          title: 'Mise à jour disponible',
          message: 'Une nouvelle version de Calc AE est disponible. Voulez-vous l\'installer maintenant ?',
          detail,
          noLink: true,
        });
        if (res.response === 0) {
          // Télécharger et installer
          this.autoInstallAfterDownload = true;
          try {
            await autoUpdater.downloadUpdate();
            // L'installation sera déclenchée sur 'update-downloaded'
          } catch (e) {
            console.error('Erreur téléchargement mise à jour:', e);
            this._send('update:error', { message: String(e && e.message || e) });
          }
        } else {
          // Refus : continuer sans MAJ
          this._send('update:deferred', info);
        }
      } catch (e) {
        console.error('Erreur lors de la demande de confirmation MAJ:', e);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('✅ Pas de mise à jour disponible:', info);
      this.updateAvailable = false;
      this._send('update:none', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('❌ Erreur auto-update:', err);
      this.updateAvailable = false;
      this.updateDownloaded = false;
      this._send('update:error', { message: String(err && err.message || err) });
    });

    autoUpdater.on('download-progress', (p) => {
      this._send('update:progress', p);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ Mise à jour téléchargée:', info);
      this.updateDownloaded = true;
      this._send('update:downloaded', info);
      if (this.autoInstallAfterDownload) {
        this.autoInstallAfterDownload = false;
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    });
  }

  // Simple test réseau: résolution DNS avec timeout
  async _hasNetwork(timeoutMs = 2500) {
    return new Promise((resolve) => {
      const to = setTimeout(() => resolve(false), timeoutMs);
      dns.resolve('github.com', (err) => {
        clearTimeout(to);
        resolve(!err);
      });
    });
  }

  checkForUpdatesOnStartup() {
    setTimeout(async () => {
      try {
        const online = await this._hasNetwork();
        if (!online) {
          console.log('⏭️  Pas de réseau, on saute la vérification de mise à jour');
          this._send('update:offline', {});
          return;
        }
        await autoUpdater.checkForUpdates();
      } catch (e) {
        console.error('Update check failed:', e);
      }
    }, 3000);
  }

  checkForUpdatesNow() {
    try {
      return this._hasNetwork().then((online) => {
        if (!online) {
          this._send('update:offline', {});
          return null;
        }
        return autoUpdater.checkForUpdates();
      });
    } catch (e) {
      console.error('Manual update check failed:', e);
    }
  }

  downloadAndInstall() {
    this.autoInstallAfterDownload = true;
    return autoUpdater.downloadUpdate();
  }
}

module.exports = UpdateManager;
