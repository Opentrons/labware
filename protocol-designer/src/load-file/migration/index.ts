import flow from 'lodash/flow'
import takeRightWhile from 'lodash/takeRightWhile'
import semver from 'semver'
import { migrateFile as migrateFileOne } from './1_1_0'
import { migrateFile as migrateFileThree } from './3_0_0'
import { migrateFile as migrateFileFour } from './4_0_0'
import { migrateFile as migrateFileFive } from './5_0_0'
import { migrateFile as migrateFileFiveOne } from './5_1_0'
import { migrateFile as migrateFileFiveTwo } from './5_2_0'
import { migrateFile as migrateFileSix } from './6_0_0'
import { migrateFile as migrateFileSeven } from './7_0_0'
import { migrateFile as migrateFileEight } from './8_0_0'
import { migrateFile as migrateFileEightOne } from './8_1_0'
import { migrateFile as migrateFileEightTwo } from './8_2_0'
import { migrateFile as migrateFileEightTwoPointTwo } from './8_2_2'
import { migrateFile as migrateFileEightFive } from './8_5_0'

import type { PDProtocolFile } from '../../file-types'

export const OLDEST_MIGRATEABLE_VERSION = '1.0.0'
type Version = string
type MigrationsByVersion = Record<
  Version,
  (arg0: Record<string, any>) => Record<string, any>
>
// get all versions to migrate newer than the file's applicationVersion
export const getMigrationVersionsToRunFromVersion = (
  migrationsByVersion: {},
  version: Version
): Version[] => {
  const allSortedVersions = Object.keys(migrationsByVersion).sort(
    semver.compare
  )

  return takeRightWhile(
    allSortedVersions,
    v => semver.gt(v, version) && !version.includes(v)
  )
}

const allMigrationsByVersion: MigrationsByVersion = {
  // @ts-expect-error file types are incompatible
  '1.1.0': migrateFileOne,
  // @ts-expect-error file types are incompatible
  '3.0.0': migrateFileThree,
  '4.0.0': migrateFileFour,
  '5.0.0': migrateFileFive,
  '5.1.0': migrateFileFiveOne,
  '5.2.0': migrateFileFiveTwo,
  // @ts-expect-error fix MigrationsByVersion type (and the function signatures of the older migration functions above)
  '6.0.0': migrateFileSix,
  // @ts-expect-error fix MigrationsByVersion type (and the function signatures of the older migration functions above)
  '7.0.0': migrateFileSeven,
  // @ts-expect-error fix MigrationsByVersion type (and the function signatures of the older migration functions above)
  '8.0.0': migrateFileEight,
  // @ts-expect-error
  '8.1.0': migrateFileEightOne,
  // @ts-expect-error
  '8.2.0': migrateFileEightTwo,
  // @ts-expect-error
  '8.2.2': migrateFileEightTwoPointTwo,
  // @ts-expect-error
  '8.5.0': migrateFileEightFive,
}
export const migration = (
  file: any
): {
  file: PDProtocolFile
  didMigrate: boolean
  migrationsRan: string[]
} => {
  const designerApplication =
    file.designerApplication || file['designer-application']
  // NOTE: default exists because any protocol that doesn't include the application version
  // key will be treated as the oldest migrateable version ('1.0.0')
  const applicationVersion: string =
    designerApplication.applicationVersion ||
    designerApplication.version ||
    OLDEST_MIGRATEABLE_VERSION
  const migrationVersionsToRun = getMigrationVersionsToRunFromVersion(
    allMigrationsByVersion,
    applicationVersion
  )
  const migratedFile = flow(
    migrationVersionsToRun.map(version => allMigrationsByVersion[version])
  )(file)

  return {
    file: migratedFile,
    didMigrate: migrationVersionsToRun.length > 0,
    migrationsRan: migrationVersionsToRun,
  }
}
