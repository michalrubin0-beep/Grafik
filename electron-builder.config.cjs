const packageConfig = require('./package.json')

const owner = process.env.GRAFIKPRO_GITHUB_OWNER || 'michalrubin0-beep'
const repo = process.env.GRAFIKPRO_GITHUB_REPO || 'Grafik'
const updatesRequired = process.env.GRAFIKPRO_REQUIRE_UPDATES === 'true'
const publishing = process.env.GRAFIKPRO_PUBLISH === 'true'

if (updatesRequired && (!owner || !repo)) {
  throw new Error('Ustaw GRAFIKPRO_GITHUB_OWNER i GRAFIKPRO_GITHUB_REPO przed budowaniem aplikacji do aktualizacji.')
}

if (publishing && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  throw new Error('Publikowanie wymaga GH_TOKEN lub GITHUB_TOKEN. Nie zapisuj tokenu w plikach projektu.')
}

const config = { ...packageConfig.build }

if (owner && repo) {
  config.publish = [{
    provider: 'github',
    owner,
    repo,
    releaseType: 'release',
  }]
}

module.exports = config
