function createUpdateService({ app, updater, database, ipcMain, getWindow }) {
  let downloaded = false
  let checking = false
  let status = { state: 'idle' }

  const publish = (nextStatus) => {
    status = nextStatus
    const window = getWindow()
    if (window && !window.isDestroyed()) {
      window.webContents.send('grafikpro:update-status', status)
    }
    return status
  }

  const reportError = (error) => {
    checking = false
    return publish({
      state: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }

  const onChecking = () => {
    checking = true
    publish({ state: 'checking' })
  }
  const onAvailable = (info) => {
    checking = false
    downloaded = false
    publish({ state: 'available', version: info.version })
  }
  const onNotAvailable = (info) => {
    checking = false
    publish({ state: 'not-available', version: info.version })
  }
  const onProgress = (progress) => publish({
    state: 'downloading',
    percent: Math.round(progress.percent),
  })
  const onDownloaded = (info) => {
    downloaded = true
    publish({ state: 'downloaded', version: info.version })
  }
  const onError = (error) => reportError(error)

  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false
  updater.on('checking-for-update', onChecking)
  updater.on('update-available', onAvailable)
  updater.on('update-not-available', onNotAvailable)
  updater.on('download-progress', onProgress)
  updater.on('update-downloaded', onDownloaded)
  updater.on('error', onError)

  const checkForUpdates = async () => {
    if (!app.isPackaged) {
      return publish({
        state: 'unavailable',
        message: 'Sprawdzanie aktualizacji jest dostępne w zainstalowanej aplikacji.',
      })
    }
    if (checking) return status

    checking = true
    publish({ state: 'checking' })
    try {
      await updater.checkForUpdates()
      return status
    } catch (error) {
      return reportError(error)
    }
  }

  const downloadUpdate = async () => {
    if (!app.isPackaged) {
      return publish({
        state: 'unavailable',
        message: 'Pobieranie aktualizacji jest dostępne w zainstalowanej aplikacji.',
      })
    }
    if (status.state !== 'available') {
      return publish({ state: 'error', message: 'Najpierw sprawdź dostępność aktualizacji.' })
    }

    publish({ state: 'downloading', percent: 0 })
    try {
      await updater.downloadUpdate()
      return status
    } catch (error) {
      return reportError(error)
    }
  }

  const installUpdate = async () => {
    if (!downloaded) {
      return publish({ state: 'error', message: 'Aktualizacja nie jest jeszcze gotowa do instalacji.' })
    }

    try {
      const backupPath = await database.createPreUpdateBackup()
      if (!backupPath) throw new Error('Nie udało się utworzyć kopii zapasowej przed aktualizacją.')

      const nextStatus = publish({ state: 'installing' })
      updater.quitAndInstall()
      return nextStatus
    } catch (error) {
      return reportError(error)
    }
  }

  ipcMain.handle('grafikpro:get-app-version', () => app.getVersion())
  ipcMain.handle('grafikpro:updates:get-state', () => status)
  ipcMain.handle('grafikpro:updates:check', checkForUpdates)
  ipcMain.handle('grafikpro:updates:download', downloadUpdate)
  ipcMain.handle('grafikpro:updates:install', installUpdate)

  return {
    checkForUpdates,
    dispose() {
      updater.removeListener('checking-for-update', onChecking)
      updater.removeListener('update-available', onAvailable)
      updater.removeListener('update-not-available', onNotAvailable)
      updater.removeListener('download-progress', onProgress)
      updater.removeListener('update-downloaded', onDownloaded)
      updater.removeListener('error', onError)
      for (const channel of [
        'grafikpro:get-app-version',
        'grafikpro:updates:get-state',
        'grafikpro:updates:check',
        'grafikpro:updates:download',
        'grafikpro:updates:install',
      ]) {
        ipcMain.removeHandler(channel)
      }
    },
  }
}

module.exports = { createUpdateService }
