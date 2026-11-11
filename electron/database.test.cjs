const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const initializeSql = require('sql.js')
const { createGrafikProDatabase } = require('./database.cjs')

function fixture(companyName = 'Testowa firma') {
  return {
    companySettings: {
      id: 'company-settings',
      companyName,
      openingHoursStart: '07:00',
      openingHoursEnd: '22:00',
      workingDays: ['Pon'],
      defaultBreakMinutes: 30,
      currency: 'PLN',
      dateFormat: 'dd.MM.yyyy',
      firstDayOfWeek: 1,
      theme: 'dark',
    },
    employees: [{ id: 'employee-1', firstName: 'Anna', lastName: 'Test' }],
    positions: [{ id: 'position-1', name: 'Kasjer' }],
    shifts: [{ id: 'shift-1', employeeId: 'employee-1', date: '2026-11-09', start: '08:00', end: '16:00' }],
    availability: [{ id: 'availability-1', employeeId: 'employee-1', day: 'Pon', start: '08:00', end: '16:00', type: 'available' }],
  }
}

test('stores data in SQLite, creates an automatic backup and restores an exported copy', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grafikpro-sqlite-'))
  const store = await createGrafikProDatabase(directory)
  context.after(() => {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  })
  const original = fixture()
  await store.saveData(original)

  assert.deepEqual(store.loadData(), original)
  const info = store.getStorageInfo()
  assert.ok(info.latestBackup)
  assert.ok(fs.existsSync(path.join(info.backupDirectory, info.latestBackup)))

  const exportedBackup = path.join(directory, 'exported-backup.sqlite')
  await store.exportDatabase(exportedBackup)
  await store.saveData(fixture('Zmodyfikowana firma'))
  assert.equal(store.loadData().companySettings.companyName, 'Zmodyfikowana firma')

  await store.restoreBackup(exportedBackup)
  assert.deepEqual(store.loadData(), original)
})

test('does not replace the database with an invalid backup', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grafikpro-invalid-backup-'))
  const store = await createGrafikProDatabase(directory)
  context.after(() => {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  })
  const data = fixture()
  await store.saveData(data)
  const invalidBackup = path.join(directory, 'invalid.sqlite')
  fs.writeFileSync(invalidBackup, 'not a SQLite database')

  await assert.rejects(store.restoreBackup(invalidBackup))
  assert.deepEqual(store.loadData(), data)
})

test('preserves a newly added employee and archived employee history after reopening SQLite', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grafikpro-employees-'))
  let store = await createGrafikProDatabase(directory)
  context.after(() => {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  })

  const data = fixture()
  data.employees.push({ id: 'employee-2', firstName: 'Ewa', lastName: 'Nowa', active: true })
  await store.saveData(data)
  store.close()

  store = await createGrafikProDatabase(directory)
  assert.deepEqual(store.loadData(), data)

  const archived = {
    ...data,
    employees: data.employees.map((employee) =>
      employee.id === 'employee-1' ? { ...employee, active: false } : employee,
    ),
  }
  await store.saveData(archived)
  store.close()

  store = await createGrafikProDatabase(directory)
  assert.deepEqual(store.loadData(), archived)
  assert.equal(store.loadData().shifts[0].employeeId, 'employee-1')
  assert.equal(store.loadData().availability[0].employeeId, 'employee-1')
})

test('creates an independent backup immediately before updating', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grafikpro-update-backup-'))
  const store = await createGrafikProDatabase(directory)
  context.after(() => {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  })

  await store.saveData(fixture())
  const automaticBackup = store.getStorageInfo().latestBackup
  const updateBackup = await store.createPreUpdateBackup()

  assert.ok(updateBackup)
  assert.notEqual(path.basename(updateBackup), automaticBackup)
  assert.ok(fs.existsSync(updateBackup))
  assert.deepEqual(store.loadData(), fixture())
})

test('backs up and migrates an older schema without changing application data', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grafikpro-migration-'))
  const databasePath = path.join(directory, 'grafikpro.sqlite')
  let store = await createGrafikProDatabase(directory)
  context.after(() => {
    store.close()
    fs.rmSync(directory, { recursive: true, force: true })
  })

  const original = fixture()
  await store.saveData(original)
  store.close()

  const SQL = await initializeSql({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  })
  const legacyDatabase = new SQL.Database(fs.readFileSync(databasePath))
  legacyDatabase.run('UPDATE app_meta SET value = ? WHERE key = ?', ['1', 'schema_version'])
  legacyDatabase.exec('DROP TABLE IF EXISTS schema_migrations; DROP INDEX IF EXISTS shifts_date_idx; DROP INDEX IF EXISTS availability_employee_idx;')
  fs.writeFileSync(databasePath, Buffer.from(legacyDatabase.export()))
  legacyDatabase.close()

  store = await createGrafikProDatabase(directory)
  assert.deepEqual(store.loadData(), original)
  const migrationBackup = fs.readdirSync(store.getStorageInfo().backupDirectory)
    .find((name) => name.includes('-migration'))
  assert.ok(migrationBackup)
  store.close()

  const migratedDatabase = new SQL.Database(fs.readFileSync(databasePath))
  const [[schemaVersion]] = migratedDatabase.exec("SELECT value FROM app_meta WHERE key = 'schema_version'")[0].values
  const [[migrationVersion]] = migratedDatabase.exec('SELECT version FROM schema_migrations')[0].values
  assert.equal(schemaVersion, '2')
  assert.equal(migrationVersion, 2)

  const backupDatabase = new SQL.Database(fs.readFileSync(path.join(directory, 'backups', migrationBackup)))
  const [[backupVersion]] = backupDatabase.exec("SELECT value FROM app_meta WHERE key = 'schema_version'")[0].values
  assert.equal(backupVersion, '1')
  backupDatabase.close()
  migratedDatabase.close()
})

test('refuses a newer database schema without changing its file', async (context) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grafikpro-future-schema-'))
  const databasePath = path.join(directory, 'grafikpro.sqlite')
  const store = await createGrafikProDatabase(directory)
  context.after(() => {
    fs.rmSync(directory, { recursive: true, force: true })
  })

  await store.saveData(fixture())
  store.close()
  const SQL = await initializeSql({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  })
  const database = new SQL.Database(fs.readFileSync(databasePath))
  database.run('UPDATE app_meta SET value = ? WHERE key = ?', ['99', 'schema_version'])
  fs.writeFileSync(databasePath, Buffer.from(database.export()))
  database.close()
  const originalBytes = fs.readFileSync(databasePath)

  await assert.rejects(
    createGrafikProDatabase(directory),
    /nowszą wersję schematu/,
  )
  assert.deepEqual(fs.readFileSync(databasePath), originalBytes)
})
