import type { AppData } from './types'

export type DesktopUpdateStatus =
  | { state: 'idle' | 'checking' | 'installing' }
  | { state: 'available' | 'downloaded' | 'not-available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'error' | 'unavailable'; message: string }

type DesktopDialogResult = {
  canceled: boolean
  filePath?: string
}

type DesktopRestoreResult = {
  canceled: boolean
}

type DesktopStorageInfo = {
  databasePath: string
  backupDirectory: string
  latestBackup: string | null
}

type GrafikProDesktopBridge = {
  loadData: () => Promise<AppData | null>
  saveData: (data: AppData) => Promise<void>
  getStorageInfo: () => Promise<DesktopStorageInfo>
  exportBackup: () => Promise<DesktopDialogResult>
  restoreBackup: () => Promise<DesktopRestoreResult>
  getAppVersion: () => Promise<string>
  getUpdateState: () => Promise<DesktopUpdateStatus>
  checkForUpdates: () => Promise<DesktopUpdateStatus>
  downloadUpdate: () => Promise<DesktopUpdateStatus>
  installUpdate: () => Promise<DesktopUpdateStatus>
  onUpdateStatus: (callback: (status: DesktopUpdateStatus) => void) => () => void
}

declare global {
  interface Window {
    grafikProDesktop?: GrafikProDesktopBridge
  }
}

export {}
