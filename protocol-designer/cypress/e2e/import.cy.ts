import { TestFilePath, getTestFile } from '../support/testFiles'
import {
  verifyOldProtocolModal,
  verifyImportProtocolPage,
} from '../support/import'

describe('The Import Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
  })

  it('successfully loads a protocol exported on a previous version', () => {
    const protocol = getTestFile(TestFilePath.DoItAllV7)
    cy.importProtocol(protocol.path)
    verifyOldProtocolModal()
    verifyImportProtocolPage(protocol)
  })

  it('successfully loads a protocol exported on the current version', () => {
    const protocol = getTestFile(TestFilePath.DoItAllV8)
    cy.importProtocol(protocol.path)
    verifyImportProtocolPage(protocol)
  })
})
