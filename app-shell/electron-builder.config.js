'use strict'
const path = require('path')

const { OT_APP_DEPLOY_BUCKET, OT_APP_DEPLOY_FOLDER } = process.env
const DEV_MODE = process.env.NODE_ENV !== 'production'
const USE_PYTHON = process.env.NO_PYTHON !== 'true'
const WINDOWS_SIGN = process.env.WINDOWS_SIGN === 'true'
const project = process.env.OPENTRONS_PROJECT ?? 'robot-stack'

// this will generate either
// https://builds.opentrons.com/app/ or https://ot3-development.builds.opentrons.com/app/
// because these environment variables are provided by ci
const publishConfig =
  OT_APP_DEPLOY_BUCKET && OT_APP_DEPLOY_FOLDER
    ? {
        provider: 'generic',
        url: `https://${OT_APP_DEPLOY_BUCKET}/${OT_APP_DEPLOY_FOLDER}/`,
      }
    : null

module.exports = async () => ({
  appId:
    project === 'robot-stack' ? 'com.opentrons.app' : 'com.opentrons.appot3',
  electronVersion: '33.2.1',
  npmRebuild: false,
  releaseInfo: {
    releaseNotesFile:
      project === 'robot-stack'
        ? 'release-notes.md'
        : 'release-notes-internal.md',
  },
  files: [
    '**/*',
    'build/br-premigration-wheels',
    '!Makefile',
    '!python',
    {
      from: '../app/dist',
      to: './ui',
      filter: ['**/*'],
    },
  ],
  extraMetadata: {
    version: await (
      await import('../scripts/git-version.mjs')
    ).versionForProject(project),
    productName: project === 'robot-stack' ? 'Opentrons' : 'Opentrons-OT3',
  },
  extraResources: USE_PYTHON ? ['python'] : [],
  /* eslint-disable no-template-curly-in-string */
  artifactName: '${productName}-v${version}-${os}-${env.BUILD_ID}.${ext}',
  /* eslint-enable no-template-curly-in-string */
  asar: true,
  mac: {
    target: process.platform === 'darwin' ? ['dmg', 'zip'] : ['zip'],
    category: 'public.app-category.productivity',
    type: DEV_MODE ? 'development' : 'distribution',
    icon: project === 'robot-stack' ? 'build/icon.icns' : 'build/three.icns',
    forceCodeSigning: !DEV_MODE,
    gatekeeperAssess: true,
    // note: notarize.teamId is passed by implicitly sending through the APPLE_TEAM_ID env var
  },
  dmg: {
    icon: null,
  },
  win: {
    target: ['nsis'],
    publisherName: 'Opentrons Labworks Inc.',
    icon: project === 'robot-stack' ? 'build/icon.ico' : 'build/three.ico',
    forceCodeSigning: WINDOWS_SIGN,
    rfc3161TimeStampServer: 'http://timestamp.digicert.com',
    sign: 'scripts/windows-custom-sign.js',
    signDlls: true,
    signingHashAlgorithms: ['sha256'],
  },
  nsis: {
    oneClick: false,
    license: 'build/license_en.txt',
  },
  linux: {
    target: ['AppImage'],
    executableName: 'opentrons',
    category: 'Science',
    icon: project === 'robot-stack' ? 'build/icon.icns' : 'build/three.icns',
  },
  appImage: {
    license: 'build/license_en.txt',
  },
  publish: publishConfig,
  generateUpdatesFilesForAllChannels: true,
  beforePack: path.join(__dirname, './scripts/before-pack.js'),
})
