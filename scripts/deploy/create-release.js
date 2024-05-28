'use strict'

// Creates a release asset in github for a tag with autogenerated changelogs following
// conventional-commit specifications.
//
// Usage: node create-release.js <token> <tag> [--deploy]
// token should be a github token capable of creating a release
// tag should be the tag for which the release should be created
// --deploy should be specified to actually create the release; if not specified, the script
//          will print what it would do but not do it
// --allow-old allows the use of a tag that does not point to one of the last 100 commits. We
//             only check the last 100 commits for the recent tag to not bog everything down,
//             so normally if you try to make a release for a really old commit the check that
//             prevents you from getting a conventional-changelog for the wrong thing will
//             false-positive. Set this flag to not do that check.
// The release will be created as a prerelease if this is a prerelease tag.
// It will always be created as a draft so that humans can review it before it goes live.
//
// The changelog content will be in the body of the release.

const parseArgs = require('./lib/parseArgs')
const conventionalChangelog = require('conventional-changelog')
const semver = require('semver')
const { Octokit } = require('@octokit/rest')

const USAGE =
  '\nUsage:\n node ./scripts/deploy/create-release <token> <tag> [--deploy] [--allow-old]'

// The allowed types of release. The order matters here - order in this array determines the
// "release kind greater than or equal to" logic for generating changelogs. A version matching
// one of the entries in this array will have its changelogs generated from the closest version
// matching the same type or a type to its right.
const ALLOWED_VERSION_TYPES = ['alpha', 'beta', 'candidate', 'production']
const REPO_DETAILS = {
  owner: 'Opentrons',
  repo: 'opentrons',
}

// The release kind is normally just the semver preproduction stage, but we need to account
// for PD using candidate-a, candidate-b etc - semver preproduction stage is separated from
// sequence by a . normally (i.e. alpha.0, beta.32), so semver.prerelease('candidate-a') gives
// you 'candidate-a' and we want 'candidate'
const releaseKind = version =>
  (semver.prerelease(version)?.at(0) ?? 'production').split('-')[0]

const releasePriorityGreaterThanOrEqual = (kindA, kindB) =>
  ALLOWED_VERSION_TYPES.indexOf(kindA) >= ALLOWED_VERSION_TYPES.indexOf(kindB)

const titleForProject = project => project.replaceAll('-', ' ')

const titleForRelease = (project, version) =>
  `${titleForProject(project)} version ${version}`

// Return the version to build a changelog from, which is the most recent version whose prerelease
// level is equal to or greater than the current tag. So
// - if currentVersion is a production version (no prerelease data), use the last production version
// - if currentVersion is a beta version, use the most recent version that is either beta or production
// - if currentVersion is an alpha version, use the most recent version of any kind
// currentVersion should be the version-part of the tag (i.e. not including project@, not including v)
// previousVersions should be an array of version-parts (see above) in descending semver order
function versionPrevious(currentVersion, previousVersions) {
  const currentReleaseKind = releaseKind(currentVersion)
  if (!ALLOWED_VERSION_TYPES.includes(currentReleaseKind)) {
    throw new Error(
      `Prerelease tag ${currentReleaseKind} is not one of ${ALLOWED_VERSION_TYPES.join(
        ', '
      )}`
    )
  }
  const from = previousVersions.indexOf(currentVersion)
  const notIncluding = previousVersions.slice(from + 1)
  const releasesOfGEQKind = notIncluding.filter(version =>
    releasePriorityGreaterThanOrEqual(releaseKind(version), currentReleaseKind)
  )
  return releasesOfGEQKind.length === 0 ? null : releasesOfGEQKind[0]
}

async function gitVersion() {
  let imported
  if (imported === undefined) {
    imported = await import('../git-version.mjs')
  }
  return imported
}

async function monorepoGit() {
  return await (await gitVersion()).monorepoGit()
}

async function detailsFromTag(tag) {
  return await (await gitVersion()).detailsFromTag(tag)
}

async function tagFromDetails(project, version) {
  return await (await gitVersion()).tagFromDetails(project, version)
}

async function prefixForProject(project) {
  return (await gitVersion()).prefixForProject(project)
}

async function versionDetailsFromGit(tag, allowOld) {
  if (!allowOld) {
    const git = await monorepoGit()
    const last100 = await git.log({ from: 'HEAD~100', to: 'HEAD' })

    if (!last100.all.some(commit => commit.refs.includes('tag: ' + tag))) {
      throw new Error(
        `Cannot find tag ${tag} in last 100 commits. You must run this script from a ref with ` +
          `the tag in its history to correctly generate a changelog. If your tag is very old but ` +
          `is definitely in whatever branch is checked out, use --allow-old.`
      )
    }
  }

  const [project, currentVersion] = await detailsFromTag(tag)
  const prefix = await prefixForProject(project)
  const allTags = (await (await monorepoGit()).tags([prefix + '*'])).all
  if (!allTags.includes(tag)) {
    throw new Error(
      `Tag ${tag} does not exist - create it before running this script`
    )
  }
  const allVersions = await Promise.all(allTags.map(tag => detailsFromTag(tag)))
  const sortedVersions = allVersions
    .map(details => details[1])
    .sort(semver.compare)
    .reverse()
  const previousVersion = versionPrevious(currentVersion, sortedVersions)
  return [project, currentVersion, previousVersion]
}

async function buildChangelog(project, currentVersion, previousVersion) {
  if (previousVersion === null) {
    console.warn(
      `Cannot find an appropriate previous version of ${project} for ` +
        `version ${currentVersion}. ` +
        `On the first run for a given project this script will emit an ` +
        `empty changelog.`
    )
    return (
      `## ${currentVersion}` + `\nFirst release for ${titleForProject(project)}`
    )
  }
  const previousTag = await tagFromDetails(project, previousVersion)
  const currentTag = await tagFromDetails(project, currentVersion)
  const prefix = await prefixForProject(project)
  const changelogStream = conventionalChangelog(
    { preset: 'angular', tagPrefix: prefix },
    {
      version: currentVersion,
      currentTag,
      previousTag,
      host: 'https://github.com',
      owner: REPO_DETAILS.owner,
      repository: REPO_DETAILS.repo,
      linkReferences: true,
    },
    { from: previousTag }
  )
  const chunks = []
  for await (const chunk of changelogStream) {
    chunks.push(chunk.toString())
  }
  // For some reason, later chunks include the contents of earlier chunks so we need to
  // accumulate chunks in reverse and drop earlier chunks that are included in later ones
  const changelog = chunks
    .reverse()
    .reduce(
      (accum, chunk) => (accum.includes(chunk.trim()) ? accum : chunk + accum),
      ''
    )
  return changelog
}

async function createRelease(token, tag, project, version, changelog, deploy) {
  const title = titleForRelease(project, version)
  const isPre = !!semver.prerelease(version)
  if (deploy) {
    const octokit = new Octokit({
      auth: token,
      userAgent: 'Opentrons Release Creator',
    })
    const { data } = await octokit.rest.repos.createRelease({
      owner: REPO_DETAILS.owner,
      repo: REPO_DETAILS.repo,
      tag_name: tag,
      name: title,
      body: changelog,
      draft: true,
      prerelease: isPre,
    })
    return data.html_url
  } else {
    console.log(`${tag} ${title}\n${changelog}\n${isPre ? '\nprerelease' : ''}`)
    return `http://github.com/${REPO_DETAILS.owner}/${REPO_DETAILS.repo}/releases/${tag}`
  }
}

function truncateAndAnnotate(changelog, limit, prevtag, thistag) {
  const linkmessage = `\n...and more! Log link: https://github.com/${REPO_DETAILS.owner}/${REPO_DETAILS.repo}/compare/${prevtag}...${thistag}`
  const limitWithMessage = limit - linkmessage.length
  if (changelog.length < limitWithMessage) {
    return changelog
  }
  const truncated = changelog.substring(0, limitWithMessage)

  return truncated + linkmessage
}

async function main() {
  const { args, flags } = parseArgs(process.argv.slice(2))

  const [token, tag] = args
  if (!token || !tag) {
    throw new Error(USAGE)
  }

  const deploy = flags.includes('--deploy')
  const allowOld = flags.includes('--allow-old')
  const [
    project,
    currentVersion,
    previousVersion,
  ] = await versionDetailsFromGit(tag, allowOld)
  const prefix = await prefixForProject(project)
  const changelog = await buildChangelog(
    project,
    currentVersion,
    previousVersion
  )
  const truncatedChangelog = truncateAndAnnotate(
    changelog,
    10000,
    prefix + previousVersion,
    prefix + currentVersion
  )
  return await createRelease(
    token,
    tag,
    project,
    currentVersion,
    truncatedChangelog,
    deploy
  )
}

module.exports = { versionPrevious: versionPrevious }

if (require.main === module) {
  main()
    .then(url => {
      console.log('Release created:', url)
    })
    .catch(error => {
      console.error('Release failed:', error)
      process.exitCode = -1
    })
}
