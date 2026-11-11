const fs = require('node:fs')
const path = require('node:path')
const initializeSql = require('sql.js')

const APP_ID = 'grafikpro'
const CURRENT_SCHEMA_VERSION = 2
const MIGRATIONS = [
  {
    version: 2,
    up(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS shifts_date_idx ON shifts(date);
        CREATE INDEX IF NOT EXISTS availability_employee_idx ON availability(employee_id);
      `)
    },
  },
]

function assertAppData(data) {
  if (!data || !data.companySettings || !Array.isArray(data.employees) ||
      !Array.isArray(data.positions) || !Array.isArray(data.shifts) ||
      !Array.isArray(data.availability)) {
    throw new TypeError('Otrzymano nieprawidłowy zestaw danych GrafikPro.')
  }
}

function queryRows(database, sql, parameters = []) {
  const statement = database.prepare(sql)
  try {
    statement.bind(parameters)
    const rows = []
    while (statement.step()) rows.push(statement.getAsObject())
    return rows
  } finally {
    statement.free()
  }
}

function getSchemaVersion(database) {
  const [metaTable] = queryRows(database, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'")
  if (!metaTable) return 1

  const [row] = queryRows(database, "SELECT value FROM app_meta WHERE key = 'schema_version'")
  if (!row) return 1

  const version = Number(row.value)
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error('Baza danych zawiera nieprawidłowy numer wersji schematu.')
  }
  return version
}

function applyMigrations(database) {
  let version = getSchemaVersion(database)
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Baza danych ma nowszą wersję schematu (${version}) niż obsługiwana (${CURRENT_SCHEMA_VERSION}).`)
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= version) continue

    database.run('BEGIN IMMEDIATE')
    try {
      migration.up(database)
      database.run('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ])
      database.run('UPDATE app_meta SET value = ? WHERE key = ?', [String(migration.version), 'schema_version'])
      database.run('COMMIT')
      version = migration.version
    } catch (error) {
      database.run('ROLLBACK')
      throw error
    }
  }

  return version
}

function createSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS availability (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      data TEXT NOT NULL
    );
  `)
  database.run('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', ['app_id', APP_ID])
  database.run('INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)', ['schema_version', '1'])
}

function createGrafikProDatabase(dataDirectory) {
  return initializeSql({
    locateFile: (file) => path.join(path.dirname(require.resolve('sql.js')), file),
  }).then(async (SQL) => {
    fs.mkdirSync(dataDirectory, { recursive: true })
    const databasePath = path.join(dataDirectory, 'grafikpro.sqlite')
    const backupDirectory = path.join(dataDirectory, 'backups')
    const databaseExists = fs.existsSync(databasePath)
    let database = databaseExists
      ? new SQL.Database(fs.readFileSync(databasePath))
      : new SQL.Database()

    try {
      const originalSchemaVersion = getSchemaVersion(database)
      if (originalSchemaVersion > CURRENT_SCHEMA_VERSION) {
        throw new Error(`Baza danych ma nowszą wersję schematu (${originalSchemaVersion}) niż obsługiwana (${CURRENT_SCHEMA_VERSION}).`)
      }

      if (databaseExists && originalSchemaVersion < CURRENT_SCHEMA_VERSION) {
        createBackupFile(databasePath, 'migration')
      }

      createSchema(database)
      const currentSchemaVersion = applyMigrations(database)
      if (!databaseExists || currentSchemaVersion !== originalSchemaVersion) persistToDisk()
    } catch (error) {
      database.close()
      throw error
    }

    function persistToDisk() {
      const temporaryPath = `${databasePath}.tmp`
      fs.writeFileSync(temporaryPath, Buffer.from(database.export()))
      fs.renameSync(temporaryPath, databasePath)
    }

    function createBackupFile(sourcePath, reason = '') {
      fs.mkdirSync(backupDirectory, { recursive: true })
      const timestamp = new Date().toISOString()
      const date = timestamp.slice(0, 10)
      const time = timestamp.slice(11, 19).replace(/:/g, '')
      const milliseconds = timestamp.slice(20, 23)
      let suffix = 0
      let backupPath
      do {
        const collisionSuffix = suffix ? `-${suffix}` : ''
        const reasonSuffix = reason ? `-${reason}` : ''
        backupPath = path.join(backupDirectory, `grafikpro-${date}-${time}-${milliseconds}${reasonSuffix}${collisionSuffix}.sqlite`)
        suffix += 1
      } while (fs.existsSync(backupPath))
      fs.copyFileSync(sourcePath, backupPath)
      return backupPath
    }

    function getBackupFiles() {
      if (!fs.existsSync(backupDirectory)) return []
      return fs.readdirSync(backupDirectory)
        .filter((name) => /^grafikpro-\d{4}-\d{2}-\d{2}-\d{6}(?:-\d{3})?(?:-(?:update|migration|restore))?(?:-\d+)?\.sqlite$/.test(name))
        .map((name) => ({
          name,
          path: path.join(backupDirectory, name),
          modifiedAt: fs.statSync(path.join(backupDirectory, name)).mtimeMs,
        }))
        .sort((a, b) => b.modifiedAt - a.modifiedAt)
    }

    async function createAutomaticBackup(force = false, reason = '') {
      const hasData = queryRows(database, 'SELECT 1 FROM settings LIMIT 1').length > 0
      if (!hasData && !force) return null

      const today = new Date().toISOString().slice(0, 10)
      const dailyBackupPattern = new RegExp(`^grafikpro-${today}-\\d{6}(?:-\\d{3})?(?:-\\d+)?\\.sqlite$`)
      const existing = force ? null : getBackupFiles().find((file) => dailyBackupPattern.test(file.name))
      if (existing) return existing.path

      persistToDisk()
      const backupPath = createBackupFile(databasePath, reason)

      const retentionCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      for (const backup of getBackupFiles()) {
        if (backup.modifiedAt < retentionCutoff) fs.rmSync(backup.path)
      }
      return backupPath
    }

    async function createPreUpdateBackup() {
      return createAutomaticBackup(true, 'update')
    }

    function loadData() {
      const [settings] = queryRows(database, 'SELECT data FROM settings WHERE id = ?', ['company-settings'])
      if (!settings) return null

      return {
        companySettings: JSON.parse(settings.data),
        employees: queryRows(database, 'SELECT data FROM employees').map((row) => JSON.parse(row.data)),
        positions: queryRows(database, 'SELECT data FROM positions').map((row) => JSON.parse(row.data)),
        shifts: queryRows(database, 'SELECT data FROM shifts').map((row) => JSON.parse(row.data)),
        availability: queryRows(database, 'SELECT data FROM availability').map((row) => JSON.parse(row.data)),
      }
    }

    async function saveData(data) {
      assertAppData(data)
      const alreadyInitialized = queryRows(database, 'SELECT 1 FROM settings LIMIT 1').length > 0
      if (alreadyInitialized) await createAutomaticBackup()

      database.run('BEGIN IMMEDIATE')
      try {
        database.run('INSERT OR REPLACE INTO settings (id, data) VALUES (?, ?)', [
          data.companySettings.id,
          JSON.stringify(data.companySettings),
        ])
        for (const table of ['employees', 'positions', 'shifts', 'availability']) {
          database.run(`DELETE FROM ${table}`)
        }

        for (const employee of data.employees) {
          database.run('INSERT INTO employees (id, data) VALUES (?, ?)', [employee.id, JSON.stringify(employee)])
        }
        for (const position of data.positions) {
          database.run('INSERT INTO positions (id, data) VALUES (?, ?)', [position.id, JSON.stringify(position)])
        }
        for (const shift of data.shifts) {
          database.run('INSERT INTO shifts (id, date, data) VALUES (?, ?, ?)', [shift.id, shift.date, JSON.stringify(shift)])
        }
        for (const entry of data.availability) {
          database.run('INSERT INTO availability (id, employee_id, data) VALUES (?, ?, ?)', [
            entry.id,
            entry.employeeId,
            JSON.stringify(entry),
          ])
        }
        database.run('COMMIT')
      } catch (error) {
        database.run('ROLLBACK')
        throw error
      }

      persistToDisk()
      if (!alreadyInitialized) await createAutomaticBackup()
    }

    async function exportDatabase(destination) {
      persistToDisk()
      fs.mkdirSync(path.dirname(destination), { recursive: true })
      fs.copyFileSync(databasePath, destination)
    }

    function validateBackup(sourcePath) {
      let candidate
      try {
        candidate = new SQL.Database(fs.readFileSync(sourcePath))
        const [integrity] = candidate.exec('PRAGMA integrity_check')[0]?.values[0] ?? []
        const [appId] = queryRows(candidate, "SELECT value FROM app_meta WHERE key = 'app_id'").map((row) => row.value)
        return integrity === 'ok' && appId === APP_ID
      } catch {
        return false
      } finally {
        if (candidate) candidate.close()
      }
    }

    async function restoreBackup(sourcePath) {
      if (!validateBackup(sourcePath)) {
        throw new Error('Wybrany plik nie jest prawidłową kopią zapasową GrafikPro.')
      }

      const candidate = new SQL.Database(fs.readFileSync(sourcePath))
      const previousDatabase = database
      await createAutomaticBackup(true, 'restore')
      database = candidate
      try {
        persistToDisk()
      } catch (error) {
        database = previousDatabase
        candidate.close()
        throw error
      }
      previousDatabase.close()
    }

    function getStorageInfo() {
      const latestBackup = getBackupFiles()[0]
      return {
        databasePath,
        backupDirectory,
        latestBackup: latestBackup?.name ?? null,
      }
    }

    return {
      loadData,
      saveData,
      createAutomaticBackup,
      createPreUpdateBackup,
      exportDatabase,
      restoreBackup,
      getStorageInfo,
      close: () => database.close(),
    }
  })
}

module.exports = { createGrafikProDatabase }
