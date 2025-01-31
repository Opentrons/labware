const fetch = require('node-fetch')

const APP_MANIFEST = 'https://builds.opentrons.com/ot3-oe/releases.json'

async function downloadAppManifest() {
  const response = await fetch(APP_MANIFEST)
  return await response.json()
}

/**
 * @description Get the most recent app version that is not revoked.
 * @param manifest The app manifest
 */
function latestValidVersionFromManifest(manifest) {
  const versions = Object.keys(manifest.production)
  const latestValidVersion = versions.findLast(
    version => !('revoked' in manifest.production[version])
  )

  if (latestValidVersion != null) {
    return latestValidVersion
  } else {
    throw new Error('No valid versions found')
  }
}

/**
 * @description Get `count` latest, previous non revoked versions relative to the latest version.
 * @param manifest The app manifest
 * @param latestVersion The latest valid version
 * @param count Number of previous versions to return
 * @returns {string[]} Array of version strings, ordered from newest to oldest
 */
function getPrevValidVersions(manifest, latestVersion, count) {
  const versions = Object.keys(manifest.production)
  const latestIndex = versions.indexOf(latestVersion)

  if (latestIndex === -1) {
    throw new Error('Latest version not found in manifest')
  }

  return versions
    .slice(0, latestIndex)
    .filter(version => !manifest.production[version].revoked)
    .slice(-count)
    .reverse()
}
module.exports = {
  downloadAppManifest,
  latestValidVersionFromManifest,
  getPrevValidVersions,
}
