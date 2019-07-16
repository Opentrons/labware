// roll an environment back to its previous deploy
'use strict'

const assert = require('assert')
const AWS = require('aws-sdk')

const getArgs = require('./lib/getArgs')
const syncBuckets = require('./lib/syncBuckets')
const {
  getDeployMetadata,
  setDeployMetadata,
} = require('./lib/deploy-metadata')

const USAGE =
  '\nUsage:\n  node ./scripts/deploy/rollback <project_domain> <environment> [--dryrun]'

const { args, flags } = getArgs(process.argv.slice(2))
const [projectDomain, environment] = args
const dryrun = flags.includes('--dryrun') || flags.includes('-d')

assert(
  projectDomain && (environment === 'staging' || environment === 'production'),
  USAGE
)

const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'us-east-2' })

const sandboxBucket = `sandbox.${projectDomain}`
const rollbackBucket =
  environment === 'production' ? projectDomain : `staging.${projectDomain}`

getDeployMetadata(s3, rollbackBucket)
  .then(deployMetadata => {
    const { previous, current } = deployMetadata

    console.log(`${rollbackBucket} deploy metadata: %j`, deployMetadata)
    assert(previous, 'Unable to find previous deploy tag')

    return syncBuckets(
      s3,
      { bucket: sandboxBucket, path: previous },
      { bucket: rollbackBucket },
      dryrun
    )
      .then(() =>
        setDeployMetadata(
          s3,
          rollbackBucket,
          '',
          { previous: current || null, current: previous || null },
          dryrun
        )
      )
      .then(() => {
        console.log(`Rollback of ${rollbackBucket} to ${previous} done\n`)
      })
  })
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error.message)
    process.exit(1)
  })
