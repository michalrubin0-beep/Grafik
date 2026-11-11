const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('grafikProDesktop', {
  loadData: () => ipcRenderer.invoke('grafikpro:load-data'),
  saveData: (data) => ipcRenderer.invoke('grafikpro:save-data', data),
  getStorageInfo: () => ipcRenderer.invoke('grafikpro:get-storage-info'),
  exportBackup: () => ipcRenderer.invoke('grafikpro:export-backup'),
  restoreBackup: () => ipcRenderer.invoke('grafikpro:restore-backup'),
  getAppVersion: () => ipcRenderer.invoke('grafikpro:get-app-version'),
  getUpdateState: () => ipcRenderer.invoke('grafikpro:updates:get-state'),
  checkForUpdates: () => ipcRenderer.invoke('grafikpro:updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('grafikpro:updates:download'),
  installUpdate: () => ipcRenderer.invoke('grafikpro:updates:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('grafikpro:update-status', listener)
    return () => ipcRenderer.removeListener('grafikpro:update-status', listener)
  },
})
