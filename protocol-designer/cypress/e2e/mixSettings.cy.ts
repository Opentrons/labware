import '../support/commands.ts'; // Importing the custom commands file
import {
  Actions,
  Verifications,
  runMixSetup,
} from '../support/mixSetting'
import { UniversalActions } from '../support/universalActions'
import { TestFilePath, getTestFile } from '../support/testFiles'
import {
  // verifyOldProtocolModal,
  verifyImportProtocolPage,
} from '../support/import'

describe('Redesigned Mixing Steps - Happy Path', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
    const protocol = getTestFile(TestFilePath.DoItAllV8)
    cy.importProtocol(protocol.path)
    verifyImportProtocolPage(protocol)
    
    // NOTE: vv make this chunk better//
    cy.contains("Edit protocol").click()
    cy.contains("Protocol steps").click()
    cy.get('[id="AddStepButton"]').contains("Add Step").click()
    cy.verifyOverflowBtn()
  });


  it('It should verify the working function of every permutation of mix checkboxes', () => {
    const steps: Array<Actions | Verifications | UniversalActions> = [
      Actions.SelectMix,
      UniversalActions.Snapshot,
      Verifications.PartOne,
      Actions.SelectLabware,
      Actions.SelectWellInputField,
      Verifications.WellSelectPopout,
      UniversalActions.Snapshot,
      Actions.Save,
      Actions.EnterVolume,
      Actions.EnterMixReps,
      Actions.SelectTipHandling,
      UniversalActions.Snapshot,
      Actions.Continue,
      Verifications.PartTwoAsp,
      Actions.AspirateFlowRate,
      Actions.AspWellOrder,
      Verifications.AspWellOrder,
      // Actions.Dispense,
      // Verifications.PartTwoDisp,

    ]

    runMixSetup(steps)
    // cy.contains('Primary order').closest('div')
  });
});

/*
NEED TO ADD RENAME
*/