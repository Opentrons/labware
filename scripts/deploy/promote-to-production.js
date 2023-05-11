// script to promote a project's tagged RC build from sandbox to staging
'use strict'

const assert = require('assert')
const AWS = require('aws-sdk')

const parseArgs = require('./lib/parseArgs')
const syncBuckets = require('./lib/syncBuckets')
const { getDeployMetadata } = require('./lib/deploy-metadata')

const USAGE =
  '\nUsage:\n  node ./scripts/deploy/promote-to-production <project_domain> [--deploy]'

const { args, flags } = parseArgs(process.argv.slice(2))
const [projectDomain] = args
const dryrun = !flags.includes('--deploy')

assert(projectDomain, USAGE)

const sts = new AWS.STS({ apiVersion: '2011-06-15' })

const productionAssumeRole = () => {
  return new Promise((resolve, reject) => {
    sts.assumeRole(
      {
        RoleArn: 'arn:aws:iam::043748923082:role/administrator',
        RoleSessionName: 'promoteToProduction',
      },
      (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data.Credentials)
        }
      }
    )
  })
}

productionAssumeRole()
  .then(credentials => {
    const productionCredentials = new AWS.Credentials({
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,
    })

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      region: 'us-east-1',
      credentials: productionCredentials,
    })

    const stagingBucket = `staging.${projectDomain}`
    const productionBucket = projectDomain

    getDeployMetadata(s3, stagingBucket)
      .then(deployMetadata => {
        const { current } = deployMetadata
        console.log(
          `Promoting ${projectDomain} ${current} from staging to production\n`
        )

        return syncBuckets(
          s3,
          { bucket: stagingBucket },
          { bucket: productionBucket },
          dryrun
        )
      })
      .then(() => {
        console.log('Promotion to production done\n')
        process.exit(0)
      })
      .catch(error => {
        console.error(error.message)
        process.exit(1)
      })
  })
  .catch(err => {
    console.error(err)
  })
