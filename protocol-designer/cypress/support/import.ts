// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { getTestFile, TestFile, TestFilePath } from './testFiles'
import path from 'path'
import semver from 'semver'
import cloneDeep from 'lodash/cloneDeep'
import { expectDeepEqual } from '@opentrons/shared-data/js/cypressUtils'

export interface MigrateTestCase {
  title: string
  importTestFile: TestFilePath
  expectedTestFile: TestFilePath
  unusedHardware: boolean
  migrationModal: 'newLabwareDefs' | 'v8.1' | 'noBehaviorChange' | null
}

export const ContentStrings = {
  newLabwareDefs: 'Update protocol to use new labware definitions',
  v8_1: 'The default dispense height is now 1 mm from the bottom of the well',
  noBehaviorChange:
    'We have added new features since the last time this protocol was updated, but have not made any changes to existing protocol behavior',
  unusedHardwareWarning: 'Protocol has unused hardware',
  exportButton: 'Export',
  continueButton: 'continue',
  continueWithExport: 'Continue with export',
  migrationModal:
    'Your protocol was made in an older version of Protocol Designer',
  confirmButton: 'Confirm',
  cancelButton: 'Cancel',
  protocolMetadata: 'Protocol Metadata',
  instruments: 'Instruments',
  liquidDefinitions: 'Liquid Definitions',
  protocolStartingDeck: 'Protocol Starting Deck',
}

export const LocatorStrings = {
  modalShellArea: '[aria-label="ModalShell_ModalArea"]',
  exportProtocol: `button:contains(${ContentStrings.exportButton})`,
  continueButton: `button:contains(${ContentStrings.continueButton})`,
}

export const verifyOldProtocolModal = (): void => {
  cy.get(LocatorStrings.modalShellArea)
    .should('exist')
    .should('be.visible')
    .within(() => {
      cy.contains(ContentStrings.migrationModal)
        .should('exist')
        .and('be.visible')
      cy.contains(ContentStrings.confirmButton).should('be.visible')
      cy.contains(ContentStrings.cancelButton).should('be.visible')
      cy.contains(ContentStrings.confirmButton).click()
    })
}

export const verifyImportProtocolPage = (protocol: TestFile): void => {
  cy.readFile(protocol.path).then(protocolRead => {
    cy.contains(ContentStrings.protocolMetadata).should('be.visible')
    cy.contains(ContentStrings.instruments).should('be.visible')
    cy.contains(ContentStrings.protocolStartingDeck).should('be.visible')
    cy.contains(String(protocolRead.metadata.protocolName)).should('be.visible')
  })
}

export const migrateAndMatchSnapshot = ({
  importTestFile,
  expectedTestFile,
  unusedHardware,
  migrationModal,
}: MigrateTestCase): void => {
  const uploadProtocol: TestFile = getTestFile(importTestFile)
  cy.importProtocol(uploadProtocol.path)

  if (migrationModal !== null) {
    if (migrationModal === 'v8.1') {
      cy.get('div').contains(ContentStrings.v8_1).should('exist')
    } else if (migrationModal === 'newLabwareDefs') {
      cy.get('div').contains(ContentStrings.newLabwareDefs).should('exist')
    } else if (migrationModal === 'noBehaviorChange') {
      cy.get('div').contains(ContentStrings.noBehaviorChange).should('exist')
    }
    cy.get('button')
      .contains(ContentStrings.confirmButton, { matchCase: false })
      .click()
  }

  cy.get(LocatorStrings.exportProtocol).click()

  if (unusedHardware) {
    cy.get('div').contains(ContentStrings.unusedHardwareWarning).should('exist')
    cy.contains(ContentStrings.continueWithExport).click()
  }

  const expectedProtocol: TestFile = getTestFile(expectedTestFile)

  cy.readFile(expectedProtocol.path).then(expectedProtocolRead => {
    const downloadedFilePath = path.join(
      expectedProtocol.downloadsFolder,
      `${expectedProtocolRead.metadata.protocolName}.json`
    )
    cy.readFile(downloadedFilePath, { timeout: 5000 }).should('exist')
    cy.readFile(downloadedFilePath).then(savedFile => {
      const expectedFile = cloneDeep(expectedProtocolRead)
      const version = semver.parse(
        savedFile.designerApplication.version as string
      )
      assert(version !== null, 'PD version is not valid semver')

      const files = [savedFile, expectedFile]
      files.forEach(f => {
        f.metadata.lastModified = 123
        f.designerApplication.data._internalAppBuildDate = 'Foo Date'
        f.designerApplication.version = 'x.x.x'

        Object.values(
          f.designerApplication.data.savedStepForms as Record<string, unknown>
        ).forEach(stepForm => {
          const stepFormTyped = stepForm as {
            stepType: string
            dropTip_location?: string
            blowout_location?: string
          }
          if (stepFormTyped.stepType === 'moveLiquid') {
            stepFormTyped.dropTip_location = 'trash drop tip location'
            if (stepFormTyped.blowout_location?.includes('trashBin') ?? false) {
              stepFormTyped.blowout_location = 'trash blowout location'
            }
          }
          if (stepFormTyped.stepType === 'mix') {
            stepFormTyped.dropTip_location = 'trash drop tip location'
            stepFormTyped.blowout_location = 'trash blowout location'
          }
        })

        f.commands.forEach((command: { key: string }) => {
          if ('key' in command) command.key = '123'
        })
      })

      expectDeepEqual(assert, savedFile, expectedFile)
    })
  })
}
