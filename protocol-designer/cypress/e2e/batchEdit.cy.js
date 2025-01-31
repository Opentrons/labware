//  TODO: refactor to work with new batch edit
describe('Batch Edit Transform', () => {
  // beforeEach(() => {
  //   cy.visit('/')
  //   cy.closeAnnouncementModal()
  // })
  // // import the batchEdit.json to PD
  // it('Verify Flowrate, duplicate, delete functionality in Batch Edit Mode', () => {
  //   importProtocol()
  //   openDesignTab()
  //   const isMacOSX = Cypress.platform === 'darwin'
  //   // enter into the batch edit mode
  //   cy.get('[data-test="StepItem_1"]').click({
  //     [isMacOSX ? 'metaKey' : 'ctrlKey']: true,
  //   })
  //   cy.get('button').contains('exit batch edit').should('exist')
  //   // Range selection with shift
  //   cy.get('[data-test="StepItem_3"]').click({
  //     shiftKey: true,
  //   })
  //   cy.get('#StepSelectionBannerComponent_numberStepsSelected')
  //     .contains('3 steps selected')
  //     .should('exist')
  //   // Change the Flowrate to 100 and Save
  //   cy.get('[name="aspirate_flowRate"]').click()
  //   cy.get('input[name="aspirate_flowRate_customFlowRate"]').type('100')
  //   cy.get('button').contains('Done').click()
  //   cy.get('button').contains('save').click()
  //   // Verify that transfer step 1 has Flowrate value 100
  //   cy.get('[data-test="StepItem_1"]').click({
  //     shiftKey: true,
  //   })
  //   cy.get('input[name="aspirate_flowRate"]').should('have.value', 100)
  //   // Verify that transfer and other step selection does not support multistep editing
  //   cy.get('[data-test="StepItem_4"]').click({
  //     [isMacOSX ? 'metaKey' : 'ctrlKey']: true,
  //   })
  //   cy.get('#StepSelectionBannerComponent_numberStepsSelected')
  //     .contains('2 steps selected')
  //     .should('exist')
  //   cy.get('[id=Text_noSharedSettings]').contains(
  //     'Batch editing of settings is only available for Transfer or Mix steps'
  //   )
  //   // Expand ALL steps
  //   cy.get('#ClickableIcon_expand').click()
  //   cy.get('[data-test="SubstepRow_aspirateWell"]')
  //     .contains('A1')
  //     .should('exist')
  //   // Select all the steps
  //   cy.get('#ClickableIcon_select').click()
  //   cy.get('#StepSelectionBannerComponent_numberStepsSelected')
  //     .contains('9 steps selected')
  //     .should('exist')
  //   // Duplicate the selected steps
  //   cy.get('#ClickableIcon_duplicate').click()
  //   cy.get('#ClickableIcon_select').click()
  //   cy.get('#StepSelectionBannerComponent_numberStepsSelected')
  //     .contains('18 steps selected')
  //     .should('exist')
  //   cy.get('[data-test="StepItem_9"]').click({
  //     shiftKey: true,
  //   })
  //   // Delete the duplicated steps
  //   cy.get('#ClickableIcon_delete').click()
  //   cy.get('button').contains('Delete steps').click()
  //   cy.get('#StepSelectionBannerComponent_numberStepsSelected')
  //     .contains('1 steps selected')
  //     .should('exist')
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   cy.get('button').contains('+ Add Step').should('not.be.disabled')
  // })
})

// function importProtocol() {
//   cy.fixture('../../fixtures/protocol/5/batchEdit.json').then(fileContent => {
//     cy.get('input[type=file]').upload({
//       fileContent: JSON.stringify(fileContent),
//       fileName: 'fixture.json',
//       mimeType: 'application/json',
//       encoding: 'utf8',
//     })
//     cy.get('div')
//       .contains(
//         'Your protocol will be automatically updated to the latest version.'
//       )
//       .should('exist')
//     cy.get('button').contains('ok', { matchCase: false }).click()
//     // wait until computation is done before proceeding, with generous timeout
//     cy.get('[data-test="ComputingSpinner"]', { timeout: 30000 }).should(
//       'not.exist'
//     )
//   })
// }

// function openDesignTab() {
//   cy.get('button[id=NavTab_design]').click()
//   cy.get('button').contains('ok').click()

//   // Verify the Design Page
//   cy.get('#TitleBar_main > h1').contains('Multi select banner test protocol')
//   cy.get('#TitleBar_main > h2').contains('STARTING DECK STATE')
//   cy.get('button[id=StepCreationButton]').contains('+ Add Step')
// }
