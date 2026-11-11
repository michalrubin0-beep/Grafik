const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const test = require('node:test')
const { createUpdateService } = require('./updater.cjs')

function createHarness({ isPackaged = true, backup } = {}) {
  const updater = new EventEmitter()
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  updater.checkForUpdates = async () => {}
  updater.downloadUpdate = async () => {}
  updater.quitAndInstall = () => { updater.installed = true }

  const handlers = new Map()
  const ipcMain = {
    handle: (channel, handler) => handlers.set(channel, handler),
    removeHandler: (channel) => handlers.delete(channel),
  }
  const sent = []
  const window = {
    isDestroyed: () => false,
    webContents: { send: (channel, status) => sent.push({ channel, status }) },
  }
  const database = {
    createPreUpdateBackup: backup ?? (async () => 'backup.sqlite'),
  }
  const app = { isPackaged, getVersion: () => '0.1.0' }
  const service = createUpdateService({
    app,
    updater,
    database,
    ipcMain,
    getWindow: () => window,
  })

  return { app, database, handlers, ipcMain, sent, service, updater }
}

test('disables automatic downloads and reports development builds as unavailable', async () => {
  const { handlers, updater } = createHarness({ isPackaged: false })

  assert.equal(updater.autoDownload, false)
  assert.equal(updater.autoInstallOnAppQuit, false)
  const status = await handlers.get('grafikpro:updates:check')()

  assert.equal(status.state, 'unavailable')
})

test('checks for updates and forwards available version status', async () => {
  const { handlers, updater, sent } = createHarness()
  updater.checkForUpdates = async () => {
    updater.emit('update-available', { version: '0.2.0' })
  }

  const status = await handlers.get('grafikpro:updates:check')()

  assert.deepEqual(status, { state: 'available', version: '0.2.0' })
  assert.equal(sent.at(-1).channel, 'grafikpro:update-status')
})

test('requires a successful pre-update backup before installation', async () => {
  const backupError = new Error('Dysk niedostępny')
  const { handlers, updater, sent } = createHarness({
    backup: async () => { throw backupError },
  })
  updater.emit('update-downloaded', { version: '0.2.0' })

  const status = await handlers.get('grafikpro:updates:install')()

  assert.deepEqual(status, { state: 'error', message: backupError.message })
  assert.equal(updater.installed, undefined)
  assert.equal(sent.at(-1).status.state, 'error')
})

test('backs up data before installing a downloaded update', async () => {
  let backupCount = 0
  const { handlers, updater } = createHarness({
    backup: async () => {
      backupCount += 1
      return 'backup.sqlite'
    },
  })
  updater.emit('update-downloaded', { version: '0.2.0' })

  const status = await handlers.get('grafikpro:updates:install')()

  assert.deepEqual(status, { state: 'installing' })
  assert.equal(backupCount, 1)
  assert.equal(updater.installed, true)
})
