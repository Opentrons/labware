import 'cypress-file-upload'
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { MigrateTestCase, migrateAndMatchSnapshot } from '../support/import'
import { TestFilePath } from '../support/testFiles'

describe('Protocol fixtures migrate and match snapshots', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
  })

  const testCases: MigrateTestCase[] = [
    {
      title: 'example_1_1_0 (schema 1, PD version 1.1.1) -> PD 8.5.x, schema 8',
      importTestFile: TestFilePath.Example_1_1_0,
      expectedTestFile: TestFilePath.Example_1_1_0V8,
      unusedHardware: true,
      migrationModal: 'newLabwareDefs',
    },
    {
      title: 'doItAllV3 (schema 3, PD version 4.0.0) -> PD 8.5.x, schema 8',
      importTestFile: TestFilePath.DoItAllV3V4,
      expectedTestFile: TestFilePath.DoItAllV3MigratedToV8,
      unusedHardware: false,
      migrationModal: 'v8.1',
    },
    {
      title: 'doItAllV4 (schema 4, PD version 4.0.0) -> PD 8.5.x, schema 8',
      importTestFile: TestFilePath.DoItAllV4V4,
      expectedTestFile: TestFilePath.DoItAllV4MigratedToV8,
      unusedHardware: false,
      migrationModal: 'v8.1',
    },
    {
      title:
        'doItAllv7MigratedToV8 (schema 7, PD version 8.0.0) -> should migrate to 8.5.x, schema 8',
      importTestFile: TestFilePath.DoItAllV7,
      expectedTestFile: TestFilePath.DoItAllV7MigratedToV8,
      unusedHardware: false,
      migrationModal: 'v8.1',
    },
    {
      title:
        '96-channel full and column schema 8 -> should migrate to 8.5.x, schema 8',
      importTestFile: TestFilePath.NinetySixChannelFullAndColumn,
      expectedTestFile: TestFilePath.NinetySixChannelFullAndColumn,
      unusedHardware: false,
      migrationModal: null,
    },
    {
      title:
        'doItAllV8 flex robot -> reimported, should migrate to 8.5.x, schema 8',
      importTestFile: TestFilePath.DoItAllV8,
      expectedTestFile: TestFilePath.DoItAllV8,
      unusedHardware: false,
      migrationModal: null,
    },
    {
      title:
        'new advanced settings with multi temp => reimported, should not migrate and stay at 8.5.x, schema 8',
      importTestFile: TestFilePath.NewAdvancedSettingsAndMultiTemp,
      expectedTestFile: TestFilePath.NewAdvancedSettingsAndMultiTemp,
      unusedHardware: false,
      migrationModal: null,
    },
    {
      title:
        'thermocycler on Ot2 (schema 7, PD version 7.0.0) -> should migrate to 8.5.x, schema 8',
      importTestFile: TestFilePath.ThermocyclerOnOt2V7,
      expectedTestFile: TestFilePath.ThermocyclerOnOt2V7MigratedToV8,
      migrationModal: 'v8.1',
      unusedHardware: true,
    },
  ]

  testCases.forEach(
    ({
      title,
      importTestFile,
      expectedTestFile,
      unusedHardware,
      migrationModal,
    }) => {
      it(title, () => {
        migrateAndMatchSnapshot({
          title,
          importTestFile,
          expectedTestFile,
          unusedHardware,
          migrationModal,
        })
      })
    }
  )
})
