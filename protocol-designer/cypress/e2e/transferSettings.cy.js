// TODO: refactor to test with new navigation
// const isMacOSX = Cypress.platform === 'darwin'
// const batchEditClickOptions = { [isMacOSX ? 'metaKey' : 'ctrlKey']: true }

// const invalidInput = 'abcdefghijklmnopqrstuvwxyz!@#$%^&*()<>?,-'

// function importProtocol() {
//   cy.fixture('../../fixtures/protocol/5/transferSettings.json').then(
//     fileContent => {
//       cy.get('input[type=file]').upload({
//         fileContent: JSON.stringify(fileContent),
//         fileName: 'fixture.json',
//         mimeType: 'application/json',
//         encoding: 'utf8',
//       })
//       cy.get('[data-test="ComputingSpinner"]').should('exist')
//       cy.get('div')
//         .contains(
//           'Your protocol will be automatically updated to the latest version.'
//         )
//         .should('exist')
//       cy.get('button').contains('ok', { matchCase: false }).click()
//       // wait until computation is done before proceeding, with generous timeout
//       cy.get('[data-test="ComputingSpinner"]', { timeout: 30000 }).should(
//         'not.exist'
//       )
//     }
//   )
// }

// function openDesignTab() {
//   cy.get('button[id=NavTab_design]').click()
//   cy.get('button').contains('ok').click()

//   // Verify the Design Page
//   cy.get('#TitleBar_main > h1').contains('Multi select banner test protocol')
//   cy.get('#TitleBar_main > h2').contains('STARTING DECK STATE')
//   cy.get('button[id=StepCreationButton]').contains('+ Add Step')
// }

// function enterBatchEdit() {
//   cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)
//   cy.get('button').contains('exit batch edit').should('exist')
// }

describe('Advanced Settings for Transfer Form', () => {
  // before(() => {
  //   cy.visit('/')
  //   cy.closeAnnouncementModal()
  //   importProtocol()
  //   openDesignTab()
  // })
  // it('Verify functionality of the transfer form', () => {
  //   // Verify functionality of advanced settings with different pipette and labware
  //   enterBatchEdit()
  //   // Different Pipette disables aspirate and dispense Flowrate and Mix settings
  //   // step 6 has different pipette than step 1
  //   cy.get('[data-test="StepItem_6"]').click(batchEditClickOptions)
  //   // Pre-wet tip is always enabled
  //   cy.get('input[name="preWetTip"]').should('be.enabled')
  //   // well-order is always enabled
  //   cy.get('[id=WellOrderField_button_aspirate]').should('be.visible')
  //   // Aspirate Flowrate and mix disabled
  //   cy.get('input[name="aspirate_flowRate"]').should('be.disabled')
  //   cy.get('input[name="aspirate_mix_checkbox"]').should('be.disabled')
  //   // TipPosition Aspirate and Dispense should be disabled
  //   cy.get('[id=TipPositionIcon_aspirate_mmFromBottom]').should(
  //     'not.be.enabled'
  //   )
  //   cy.get('[id=TipPositionIcon_dispense_mmFromBottom]').should(
  //     'not.be.enabled'
  //   )
  //   // Dispense Flowrate and mix disabled
  //   cy.get('input[name="dispense_flowRate"]').should('be.disabled')
  //   cy.get('input[name="dispense_mix_checkbox"]').should('be.disabled')
  //   // Delay , Touch tip is disabled
  //   cy.get('input[name="aspirate_delay_checkbox"]').should('be.disabled')
  //   cy.get('input[name="aspirate_touchTip_checkbox"]').should('be.disabled')
  //   // Save button is disabled
  //   cy.get('button').contains('save').should('not.be.enabled')
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Verify functionality of advanced settings with same pipette and labware
  //   // click on step 2 in batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // deselecting on step 6 in batch edit mode
  //   cy.get('[data-test="StepItem_6"]').click(batchEditClickOptions)
  //   // click on step 3 , as step 2 & 3 have same pipette and labware
  //   cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
  //   // Aspirate Flowrate and mix are enabled
  //   cy.get('input[name="aspirate_flowRate"]').should('be.enabled')
  //   cy.get('input[name="aspirate_mix_checkbox"]').should('be.enabled')
  //   // Dispense Flowrate and mix are enabled
  //   cy.get('input[name="dispense_flowRate"]').should('be.enabled')
  //   cy.get('input[name="dispense_mix_checkbox"]').should('be.enabled')
  //   // Verify invalid input in one of the fields
  //   cy.get('input[name="dispense_mix_checkbox"]').click({ force: true })
  //   cy.get('input[name="dispense_mix_volume"]')
  //     .type(invalidInput)
  //     .should('be.empty')
  //   // TipPosition Aspirate and Dispense should be enabled
  //   cy.get('[id=TipPositionIcon_aspirate_mmFromBottom]').should(
  //     'not.be.disabled'
  //   )
  //   cy.get('[id=TipPositionIcon_dispense_mmFromBottom]').should(
  //     'not.be.disabled'
  //   )
  //   // Delay in aspirate and Dispense settings is enabled
  //   cy.get('input[name="aspirate_delay_checkbox"]').should('be.enabled')
  //   cy.get('input[name="dispense_delay_checkbox"]').should('be.enabled')
  //   // Touchtip in aspirate and Dispense settings is enabled
  //   cy.get('input[name="aspirate_touchTip_checkbox"]').should('be.enabled')
  //   cy.get('input[name="dispense_touchTip_checkbox"]').should('be.enabled')
  //   // Blowout in dispense settings is enabled
  //   cy.get('input[name="blowout_checkbox"]').should('be.enabled')
  //   cy.get('button').contains('discard changes').click()
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Verify flowrate indeterminate value
  //   // click on step 2 in batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   cy.get('input[name="aspirate_flowRate"]').click({ force: true })
  //   cy.contains(
  //     'The default P1000 Single-Channel GEN2 flow rate is optimal for handling aqueous liquids'
  //   )
  //   cy.get('input[name="aspirate_flowRate_customFlowRate"]').type('100')
  //   cy.get('button').contains('Done').click()
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Click on step 4 as it has flowrate set to 100 from previous testcase
  //   cy.get('[data-test="StepItem_4"]').click(batchEditClickOptions)
  //   // indeterminate state in flowrate is empty
  //   cy.get('input[name="aspirate_flowRate"]').should('have.value', '')
  //   // Verify functionality of flowrate in batch edit transfer
  //   // Batch editing the Flowrate value
  //   cy.get('input[name="aspirate_flowRate"]').click({ force: true })
  //   cy.contains(
  //     'The default P1000 Single-Channel GEN2 flow rate is optimal for handling aqueous liquids'
  //   )
  //   cy.get('input[name="aspirate_flowRate_customFlowRate"]').type('100')
  //   cy.get('button').contains('Done').click()
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Click on step 2 to verify that flowrate is updated to 100
  //   cy.get('[data-test="StepItem_2"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that flowrate value
  //   cy.get('input[name="aspirate_flowRate"]').should('have.value', 100)
  //   // Click on step 3 to verify that flowrate is updated to 100
  //   cy.get('[data-test="StepItem_3"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that flowrate value
  //   cy.get('input[name="aspirate_flowRate"]').should('have.value', 100)
  //   // Verify prewet tip indeterminate value
  //   // Click on step 2, to enter batch edit and enable prewet tip
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // enable pre-wet tip
  //   cy.togglePreWetTip()
  //   cy.get('input[name="preWetTip"]').should('be.enabled')
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Click on step 1, as it does not have prewet-tip selected - indeteminate state
  //   cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)
  //   // Check tooltip here
  //   cy.contains('pre-wet tip').trigger('pointerover')
  //   cy.get('div[role="tooltip"]').should(
  //     'contain',
  //     'Not all selected steps are using this setting'
  //   )
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Verify mix settings indeterminate value
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_4"]').click(batchEditClickOptions)
  //   // Select mix settings
  //   cy.mixaspirate()
  //   cy.get('input[name="aspirate_mix_volume"]').type('10')
  //   cy.get('input[name="aspirate_mix_times"]').type('2')
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Click on step 3 to generate indertminate state for mix settings.
  //   cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
  //   // Verify the tooltip here
  //   cy.contains('mix').trigger('pointerover')
  //   cy.get('div[role="tooltip"]').should(
  //     'contain',
  //     'Not all selected steps are using this setting'
  //   )
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Verify mix settings batch editing in transfer form
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // Click on step 3 to batch edit mix settings
  //   cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
  //   cy.get('input[name="aspirate_mix_checkbox"]').click({ force: true })
  //   // Select mix settings
  //   cy.get('input[name="aspirate_mix_volume"]').type('10')
  //   cy.get('input[name="aspirate_mix_times"]').type('2')
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Click on step 2 to verify that mix has volume set to 10 with 2 repitititons
  //   cy.get('[data-test="StepItem_2"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that volume is set to 10 and repetitions to 2
  //   cy.get('input[name="aspirate_mix_volume"]').should('have.value', 10)
  //   cy.get('input[name="aspirate_mix_times"]').should('have.value', 2)
  //   // Verify delay settings indeterminate value
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // Select delay settings
  //   cy.get('input[name="aspirate_delay_checkbox"]')
  //     .check({ force: true })
  //     .should('be.checked')
  //   cy.get('input[name="aspirate_delay_seconds"]').type('2')
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Click on step 3 to generate indertminate state for delay settings.
  //   cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
  //   // Verify the tooltip here
  //   cy.contains('delay').trigger('pointerover')
  //   cy.get('div[role="tooltip"]').should(
  //     'contain',
  //     'Not all selected steps are using this setting'
  //   )
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Verify delay settings batch editing in transfer form
  //   // Click on step 4, to enter batch edit mode
  //   cy.get('[data-test="StepItem_4"]').click(batchEditClickOptions)
  //   // Click on step 5 to batch edit mix settings
  //   cy.get('[data-test="StepItem_5"]').click(batchEditClickOptions)
  //   // Select delay settings
  //   cy.get('input[name="aspirate_delay_checkbox"]').click({ force: true })
  //   cy.get('input[name="aspirate_delay_seconds"]').clear().type('2')
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Click on step 4 to verify that delay has volume set to 2
  //   cy.get('[data-test="StepItem_4"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that volume is set to 2 and repitions to 2
  //   cy.get('input[name="aspirate_delay_seconds"]').should('have.value', 2)
  //   // Click on step 5 to verify that delay has volume set to 2
  //   cy.get('[data-test="StepItem_5"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that volume is set to 2 and repitions to 2
  //   cy.get('input[name="aspirate_delay_seconds"]').should('have.value', 2)
  //   // Verify touchTip settings indeterminate value
  //   cy.get('[data-test="StepItem_2"]').click()
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // Select touchTip settings
  //   cy.get('input[name="aspirate_touchTip_checkbox"]').click({ force: true })
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Click on step 5 to generate indertminate state for touchTip settings.
  //   cy.get('[data-test="StepItem_5"]').click(batchEditClickOptions)
  //   // Verify the tooltip here
  //   cy.contains('touch tip').trigger('pointerover')
  //   cy.get('div[role="tooltip"]').should(
  //     'contain',
  //     'Not all selected steps are using this setting'
  //   )
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // verify touchTip settings batch editing in transfer form
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // Click on step 3 to batch edit mix settings
  //   cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
  //   // Select touchTip settings
  //   cy.get('input[name="aspirate_touchTip_checkbox"]').click({ force: true })
  //   // cy.get('[id=TipPositionModal_custom_input]').type(15)
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Click on step 2 to verify that touchTip has volume set to 2
  //   cy.get('[data-test="StepItem_2"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that volume is set
  //   cy.get('[id=TipPositionField_aspirate_touchTip_mmFromBottom]').should(
  //     'have.value',
  //     13.78
  //   )
  //   // Click on step 3 to verify that touchTip has volume set
  //   cy.get('[data-test="StepItem_3"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that volume is set
  //   cy.get('[id=TipPositionField_aspirate_touchTip_mmFromBottom]').should(
  //     'have.value',
  //     13.78
  //   )
  //   // verify blowout settings indeterminate value
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // Select blowout settings
  //   cy.get('input[name="blowout_checkbox"]').click({ force: true })
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Click on step 4 to generate indertminate state for blowout settings.
  //   cy.get('[data-test="StepItem_4"]').click(batchEditClickOptions)
  //   // Verify the tooltip here
  //   cy.contains('blowout').trigger('pointerover')
  //   cy.get('div[role="tooltip"]').should(
  //     'contain',
  //     'Not all selected steps are using this setting'
  //   )
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Verify blowout settings batch editing in transfer form
  //   // Click on step 2, to enter batch edit mode
  //   cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
  //   // Click on step 3 to batch edit mix settings
  //   cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
  //   // Select blowout settings
  //   cy.get('input[name="blowout_checkbox"]').click({ force: true })
  //   // Click save button to save the changes
  //   cy.get('button').contains('save').click()
  //   // Exit batch edit mode
  //   cy.get('button').contains('exit batch edit').click()
  //   // Click on step 2 to verify that blowout has trash selected
  //   cy.get('[data-test="StepItem_2"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that trash is selected
  //   cy.get('[id=BlowoutLocationField_dropdown]').should($input => {
  //     const value = $input.val()
  //     const expectedSubstring = 'trashBin'
  //     expect(value).to.include(expectedSubstring)
  //   })
  //   // Click on step 3 to verify the batch editing
  //   cy.get('[data-test="StepItem_3"]').click()
  //   cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()
  //   // Verify that trash is selected for the blowout option
  //   cy.get('[id=BlowoutLocationField_dropdown]').should($input => {
  //     const value = $input.val()
  //     const expectedSubstring = 'trashBin'
  //     expect(value).to.include(expectedSubstring)
  //   })
  // })
})
