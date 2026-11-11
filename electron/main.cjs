const path = require('node:path')
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const { createGrafikProDatabase } = require('./database.cjs')
const { createUpdateService } = require('./updater.cjs')

let database
let updateService

function registerDatabaseHandlers() {
  ipcMain.handle('grafikpro:load-data', () => database.loadData())
  ipcMain.handle('grafikpro:save-data', (_event, data) => database.saveData(data))
  ipcMain.handle('grafikpro:get-storage-info', () => database.getStorageInfo())

  ipcMain.handle('grafikpro:export-backup', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Zapisz kopię zapasową GrafikPro',
      defaultPath: `GrafikPro-kopia-${new Date().toISOString().slice(0, 10)}.sqlite`,
      filters: [{ name: 'Kopia bazy GrafikPro', extensions: ['sqlite'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    await database.exportDatabase(filePath)
    return { canceled: false, filePath }
  })

  ipcMain.handle('grafikpro:restore-backup', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Wybierz kopię zapasową GrafikPro',
      properties: ['openFile'],
      filters: [{ name: 'Kopia bazy GrafikPro', extensions: ['sqlite'] }],
    })
    if (canceled || !filePaths[0]) return { canceled: true }
    await database.restoreBackup(filePaths[0])
    return { canceled: false }
  })
}

function createWindow() {
  const iconPath = path.join(app.getAppPath(), 'build', 'icon.ico')
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: 'GrafikPro',
    icon: iconPath,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}

app.whenReady().then(async () => {
  database = await createGrafikProDatabase(app.getPath('userData'))
  registerDatabaseHandlers()
  updateService = createUpdateService({
    app,
    updater: autoUpdater,
    database,
    ipcMain,
    getWindow: () => BrowserWindow.getAllWindows()[0],
  })
  createWindow()
  if (app.isPackaged) {
    const updateCheck = setTimeout(() => {
      void updateService.checkForUpdates()
    }, 10_000)
    updateCheck.unref()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((error) => {
  dialog.showErrorBox('Nie można uruchomić GrafikPro', error instanceof Error ? error.message : String(error))
  app.quit()
})

app.on('before-quit', () => {
  if (updateService) updateService.dispose()
  if (database) database.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
