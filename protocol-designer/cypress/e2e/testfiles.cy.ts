import { TestFilePath, getTestFile } from '../support/testFiles'

describe('Validate Test Files', () => {
  it('should load and validate all test files', () => {
    ;(Object.keys(TestFilePath) as Array<keyof typeof TestFilePath>).forEach(
      key => {
        const testFile = getTestFile(TestFilePath[key])

        cy.log(`Loaded: ${testFile.basename}`)
        expect(testFile).to.have.property('path')

        cy.readFile(testFile.path).then(fileContent => {
          cy.log(`Loaded content for: ${testFile.basename}`)

          if (
            typeof fileContent === 'object' &&
            Boolean(fileContent?.metadata?.protocolName)
          ) {
            expect(fileContent.metadata.protocolName)
              .to.be.a('string')
              .and.have.length.greaterThan(0)
            cy.log(
              `Validated protocolName: ${fileContent.metadata.protocolName}`
            )
          }
        })
      }
    )
  })
})
