const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

const configPath = path.resolve(__dirname, '..', 'electron-builder.config.cjs')
const loadConfig = `process.stdout.write(JSON.stringify(require(${JSON.stringify(configPath)}).publish))`

function runConfig(environment) {
  return spawnSync(process.execPath, ['-e', loadConfig], {
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  })
}

test('uses the project GitHub repository by default for update-capable installers', () => {
  const result = runConfig({
    GRAFIKPRO_REQUIRE_UPDATES: 'true',
    GRAFIKPRO_GITHUB_OWNER: '',
    GRAFIKPRO_GITHUB_REPO: '',
    GRAFIKPRO_PUBLISH: '',
    GH_TOKEN: '',
    GITHUB_TOKEN: '',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), [{
    provider: 'github',
    owner: 'michalrubin0-beep',
    repo: 'Grafik',
    releaseType: 'release',
  }])
})

test('embeds the configured public GitHub release provider in update builds', () => {
  const result = runConfig({
    GRAFIKPRO_REQUIRE_UPDATES: 'true',
    GRAFIKPRO_GITHUB_OWNER: 'grafikpro-owner',
    GRAFIKPRO_GITHUB_REPO: 'GrafikPro',
    GRAFIKPRO_PUBLISH: '',
    GH_TOKEN: '',
    GITHUB_TOKEN: '',
  })

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), [{
    provider: 'github',
    owner: 'grafikpro-owner',
    repo: 'GrafikPro',
    releaseType: 'release',
  }])
})

test('requires a publishing token only when uploading a release', () => {
  const result = runConfig({
    GRAFIKPRO_REQUIRE_UPDATES: 'true',
    GRAFIKPRO_GITHUB_OWNER: 'grafikpro-owner',
    GRAFIKPRO_GITHUB_REPO: 'GrafikPro',
    GRAFIKPRO_PUBLISH: 'true',
    GH_TOKEN: '',
    GITHUB_TOKEN: '',
  })

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Publikowanie wymaga GH_TOKEN lub GITHUB_TOKEN/)
})
