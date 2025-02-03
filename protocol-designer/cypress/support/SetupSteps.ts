import 'cypress-file-upload'
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      chooseDeckSlot: (slot: string) => Cypress.Chainable<void>
    }
  }
}
export enum SetupActions {
  SelectFlex = 'Select Opentrons Flex',
  SelectOT2 = 'Select Opentrons OT-2',
  Confirm = 'Confirm',
  GoBack = 'Go back',
  SingleChannelPipette50 = 'Select 50uL Single-Channel Pipette',
  YesGripper = 'Select Yes to gripper',
  NoGripper = 'Select no to gripper',
  AddThermocycler = 'Thermocycler Module GEN2',
  AddHeaterShaker = 'Heater-Shaker Module GEN1',
  AddTempdeck2 = 'Temperature Module GEN2',
  AddMagBlock = 'Magnetic Block GEN1',
  EditProtocolA = 'Blue button edit protocol',
  choseDeckSlot = 'Chose each deck slot',
  ChoseDeckSlotA1 = 'Choose deck slot A1',
  ChoseDeckSlotA2 = 'Choose deck slot A2',
  ChoseDeckSlotA3 = 'Choose deck slot A3',
  ChoseDeckSlotB1 = 'Choose deck slot B1',
  ChoseDeckSlotB2 = 'Choose deck slot B2',
  ChoseDeckSlotB3 = 'Choose deck slot B3',
  ChoseDeckSlotC1 = 'Choose deck slot C1',
  ChoseDeckSlotC2 = 'Choose deck slot C2',
  ChoseDeckSlotC2Labware = 'Chose labware on deck slot C2',
  ChoseDeckSlotC3 = 'Choose deck slot C3',
  ChoseDeckSlotD1 = 'Choose deck slot D1',
  ChoseDeckSlotD2 = 'Choose deck slot D2',
  ChoseDeckSlotD3 = 'Choose deck slot D3',
  AddHardwareLabware = 'Adds labware to deck slot by chose deck slot',
  EditHardwareLabwareOnDeck = 'Edits existing labware/harddware on deck slot',
  ClickLabwareHeader = 'Click Labware',
  AddAdapters = 'Add an adapter to a module after selecting labware header',
  ClickWellPlatesSection = 'Click Well plates',
  SelectArmadillo96WellPlate = 'Select Armadillo 96 Well Plate',
  SelectBioRad96WellPlate = 'Select Bio-Rad 96 Well Plate',
  AddLiquid = 'Add liquid',
  DefineLiquid = 'Define a liquid',
  ClickLiquidButton = 'Click Liquid button',
  LiquidSaveWIP = 'Save liquid, is functional but could use a refactor',
  WellSelector = 'Select wells with strings A1, A2, etc. comman separated LIST',
  LiquidDropdown = 'Dropdown for liquids when adding to well',
  SelectLiquidWells = 'Select Liquid Wells',
  SetVolumeAndSaveforWells = 'Set volume and save for wells',
  ProtocolStepsH = 'Select Protocol Steps Header',
  AddStep = 'Use after making sure you are on ProtocolStepsH or have already made a step',
  DeepWellTempModAdapter = 'Select Opentrons 96 Deep Well Temperature Module Adapter',
  AddNest96DeepWellPlate = 'Adds Nest 96 Deep Well Plate',
  Done = 'Select Done on a step form',
}

export enum SetupVerifications {
  OnStep1 = 'On Step 1 page.',
  OnStep2 = 'On Step 2 page.',
  OnStep3 = 'on Step 3 page',
  FlexSelected = 'Opentrons Flex selected.',
  OT2Selected = 'Opentrons OT-2 selected.',
  NinetySixChannel = '96-Channel option is available.',
  NotNinetySixChannel = '96-Channel option is not available.',
  StepTwo50uL = 'Step Two part two',
  StepTwoPart3 = 'Step Two part three',
  Step4Verification = 'Step 4 part 1',
  ThermocyclerImg = 'Thermocycler Module GEN2',
  HeaterShakerImg = 'Heater-Shaker Module GEN1',
  Tempdeck2Img = 'Temperature Module GEN2',
  MagBlockImg = 'Magnetic Block GEN1',
  LiquidPage = 'Liquid page Content is visible',
  TransferPopOut = 'Verify Step 1 of the transfer function is present',
  TempeDeckInitialForm = 'Verify that the tempdseteck stepform opens correctly',
  Temp4CPauseTextVerification = 'Verify that the pause step has the right information in step preview',
}
export enum SetupContent {
  Step1Title = 'Step 1',
  Step2Title = 'Step 2',
  Step3Title = 'Step3',
  Step4Title = 'Step4',
  AddPipette = 'Add a pipette',
  NinetySixChannel = '96-Channel',
  SingleChannel = '1-Channel',
  EightChannel = '8-Channel',
  TipRack = 'Filter Tip Rack 50 µL',
  PipetteType = 'Pipette type',
  PipetteVolume = 'Pipette volume',
  FullP50SingleName = 'Flex 1-Channel 50 µL',
  FullP50TiprackName = 'Opentrons Flex 96 Filter Tip Rack 50 µL',
  GoBack = 'Go back',
  Confirm = 'Confirm',
  OpentronsFlex = 'Opentrons Flex',
  OpentronsOT2 = 'Opentrons OT-2',
  LetsGetStarted = 'Let’s start with the basics',
  WhatKindOfRobot = 'What kind of robot do you have?',
  Volume50 = '50 µL',
  Volume1000 = '1000 µL',
  FilterTiprack50 = 'Filter Tip Rack 50 µL',
  Tiprack50 = 'Tip Rack 50 µL',
  Yes = 'Yes',
  No = 'No',
  Thermocycler = 'Thermocycler Module GEN2',
  HeaterShaker = 'Heater-Shaker Module GEN1',
  Tempdeck2 = 'Temperature Module GEN2',
  MagBlock = 'Magnetic Block GEN1',
  ModulePageH = 'Add your modules',
  ModulePageB = 'Select modules to use in your protocol.',
  EditProtocol = 'Edit protocol',
  EditSlot = 'Edit slot',
  AddLabwareToDeck = 'Add hardware/labware',
  EditHardwareLabwareOnDeck = 'Edit hardware/labware',
  LabwareH = 'Labware',
  WellPlatesCat = 'Well plates',
  Armadillo96WellPlate200uL = 'Armadillo 96 Well Plate 200 µL PCR Full Skirt',
  Biorad96WellPlate200uL = 'Bio-Rad 96 Well Plate 200 µL PCR',
  AddLiquid = 'Add liquid',
  DefineALiquid = 'Define a liquid',
  LiquidButton = 'Liquid',
  SampleLiquidName = 'My liquid!',
  ProtocolSteps = 'Protocol steps',
  AddStep = 'Add Step',
  NestDeepWell = 'NEST 96 Deep Well Plate 2mL',
  Save = 'Save',
}

export enum SetupLocators {
  Confirm = 'button:contains("Confirm")',
  GoBack = 'button:contains("Go back")',
  Step1Indicator = 'p:contains("Step 1")',
  Step2Indicator = 'p:contains("Step 2")',
  FlexOption = 'button:contains("Opentrons Flex")',
  OT2Option = 'button:contains("Opentrons OT-2")',
  NinetySixChannel = 'div:contains("96-Channel")',
  ThermocyclerImage = 'img[alt="temperatureModuleType"]',
  MagblockImage = 'img[alt="magneticBlockType"]',
  HeaterShakerImage = 'img[alt="heaterShakerModuleType"]',
  TemperatureModuleImage = 'img[alt="temperatureModuleType"]',
  LiquidNameInput = 'input[name="displayName"]',
  ModalShellArea = 'div[aria-label="ModalShell_ModalArea"]',
  SaveButton = 'button[type="submit"]',
  LiquidsDropdown = 'div[tabindex="0"].sc-bqWxrE', // Add new locator for the dropdown
  LabwareSelectionLocation = '[data-testid="Toolbox_confirmButton"]',
  DoneButtonLabwareSelection = '[data-testid="Toolbox_confirmButton"]',
  Div = 'div',
  Button = 'button',
  TempdeckTempInput = 'input[name="targetTemperature"]',
}

const chooseDeckSlot = (
  slot: string
): Cypress.Chainable<JQuery<HTMLElement>> => {
  const deckSlots: Record<
    | 'A1'
    | 'A2'
    | 'A3'
    | 'B1'
    | 'B2'
    | 'B3'
    | 'C1'
    | 'C2'
    | 'C3'
    | 'D1'
    | 'D2'
    | 'D3',
    () => Cypress.Chainable<JQuery<HTMLElement>>
  > = {
    A1: () =>
      cy.contains('foreignObject[x="0"][y="321"]', SetupContent.EditSlot),
    A2: () =>
      cy.contains('foreignObject[x="164"][y="321"]', SetupContent.EditSlot),
    A3: () =>
      cy.contains('foreignObject[x="328"][y="321"]', SetupContent.EditSlot),
    B1: () =>
      cy.contains('foreignObject[x="0"][y="214"]', SetupContent.EditSlot),
    B2: () =>
      cy.contains('foreignObject[x="164"][y="214"]', SetupContent.EditSlot),
    B3: () =>
      cy.contains('foreignObject[x="328"][y="214"]', SetupContent.EditSlot),
    C1: () =>
      cy.contains('foreignObject[x="0"][y="107"]', SetupContent.EditSlot),
    C2: () =>
      cy.contains('foreignObject[x="164"][y="107"]', SetupContent.EditSlot),
    C3: () =>
      cy.contains('foreignObject[x="328"][y="107"]', SetupContent.EditSlot),
    D1: () => cy.contains('foreignObject[x="0"][y="0"]', SetupContent.EditSlot),
    D2: () =>
      cy.contains('foreignObject[x="164"][y="0"]', SetupContent.EditSlot),
    D3: () =>
      cy.contains('foreignObject[x="328"][y="0"]', SetupContent.EditSlot),
  }

  const slotAction = deckSlots[slot as keyof typeof deckSlots]

  if (typeof slotAction === 'function') {
    return slotAction() // Return the chainable object
  } else {
    throw new Error(`Slot ${slot} not found in deck slots.`)
  }
}
// Well name selection for liquids and in general
const selectWells = (wells: string[]): void => {
  // Define a dictionary of well selectors
  const wellSelectors: Record<
    string,
    () => Cypress.Chainable<JQuery<HTMLElement>>
  > = {}

  // Populate the dictionary dynamically
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const columns = Array.from({ length: 12 }, (_, i) => (i + 1).toString())

  rows.forEach(row => {
    columns.forEach(column => {
      const wellName = `${row}${column}`
      wellSelectors[wellName] = () =>
        cy.get(`circle[data-wellname="${wellName}"]`).click({ force: true })
    })
  })

  // Iterate over the wells array and click the corresponding wells
  wells.forEach(well => {
    const wellAction = wellSelectors[well]
    if (typeof wellAction === 'function') {
      wellAction() // Click the well
    } else {
      throw new Error(`Well ${well} not found.`)
    }
  })
}

// Example usage
// selectWells(['A1', 'B3', 'H12'])

export const executeSetupSteps = (action: SetupActions): void => {
  switch (action) {
    case SetupActions.SelectFlex:
      cy.contains(SetupContent.OpentronsFlex).should('be.visible').click()
      break

    case SetupActions.SelectOT2:
      cy.contains(SetupContent.OpentronsOT2).should('be.visible').click()
      break
    case SetupActions.Confirm:
      cy.contains(SetupContent.Confirm).should('be.visible').click()
      break
    case SetupActions.GoBack:
      cy.contains(SetupContent.GoBack).should('be.visible').click()
      break
    case SetupActions.SingleChannelPipette50:
      cy.contains('label', SetupContent.SingleChannel)
        .should('exist')
        .and('be.visible')
        .click()
      cy.contains(SetupContent.Volume50).click()
      cy.contains(SetupContent.Tiprack50).click()
      // ToDo after PR, why does this click Tiprack50 again
      // instead of clicking the filter tiprack?
      // cy.contains(SetupContent.FilterTiprack50).click()
      break
    case SetupActions.AddThermocycler:
      cy.contains(SetupContent.Thermocycler).click()
      break
    case SetupActions.AddHeaterShaker:
      cy.contains(SetupContent.HeaterShaker).click()
      break
    case SetupActions.AddTempdeck2:
      cy.contains(SetupContent.Tempdeck2).click()
      break
    case SetupActions.AddMagBlock:
      cy.contains(SetupContent.MagBlock).click()
      break
    case SetupActions.YesGripper:
      cy.contains(SetupContent.Yes).click()
      break
    case SetupActions.NoGripper:
      cy.contains(SetupContent.No).click()
      break
    case SetupActions.EditProtocolA:
      cy.contains(SetupContent.EditProtocol).click()
      break
    case SetupActions.ChoseDeckSlotA1:
      chooseDeckSlot('A1').click()
      break
    case SetupActions.ChoseDeckSlotA2:
      chooseDeckSlot('A2').click()
      break
    case SetupActions.ChoseDeckSlotA3:
      chooseDeckSlot('A3').click()
      break
    case SetupActions.ChoseDeckSlotB1:
      chooseDeckSlot('B1').click()
      break
    case SetupActions.ChoseDeckSlotB2:
      chooseDeckSlot('B2').click()
      break
    case SetupActions.ChoseDeckSlotB3:
      chooseDeckSlot('B3').click()
      break
    case SetupActions.ChoseDeckSlotC1:
      chooseDeckSlot('C1').click()
      break
    case SetupActions.ChoseDeckSlotC2:
      chooseDeckSlot('C2').click()
      break
    case SetupActions.ChoseDeckSlotC3:
      chooseDeckSlot('C3').click()
      break
    case SetupActions.ChoseDeckSlotD1:
      chooseDeckSlot('D1').click()
      break
    case SetupActions.ChoseDeckSlotD2:
      chooseDeckSlot('D2').click()
      break
    case SetupActions.ChoseDeckSlotD3:
      chooseDeckSlot('D3').click()
      break
    case SetupActions.AddHardwareLabware:
      cy.contains(SetupContent.AddLabwareToDeck).click()
      break
    case SetupActions.EditHardwareLabwareOnDeck:
      cy.contains(SetupContent.EditHardwareLabwareOnDeck).click()
      break
    case SetupActions.ClickLabwareHeader:
      cy.contains(SetupContent.LabwareH).click()
      break
    case SetupActions.ClickWellPlatesSection:
      cy.contains(SetupContent.WellPlatesCat).click()
      break
    case SetupActions.ChoseDeckSlotC2Labware:
      // Todo Investigate making a dictionary of slot editing.
      // Maybe next PR
      chooseDeckSlot('C2')
        .find('.Box-sc-8ozbhb-0.kIDovv')
        .find('a[role="button"]')
        .contains(SetupContent.EditSlot)
        .click({ force: true })
      break
    case SetupActions.SelectArmadillo96WellPlate: // New case for selecting Armadillo plate
      cy.contains(SetupContent.Armadillo96WellPlate200uL).click({ force: true })
      cy.get(SetupLocators.LabwareSelectionLocation).click({ force: true })
      break
    case SetupActions.SelectBioRad96WellPlate: // New case for selecting Armadillo plate
      cy.contains(SetupContent.Biorad96WellPlate200uL).click({ force: true })
      cy.get(SetupLocators.LabwareSelectionLocation).click({ force: true })
      break

    case SetupActions.AddLiquid: // New case for "Add liquid"
      cy.contains('button', SetupContent.AddLiquid).click()
      break
    case SetupActions.ClickLiquidButton: // New case for "Liquid button"
      cy.contains('button', SetupContent.LiquidButton).click()
      break
    case SetupActions.DefineLiquid: // New case for "Define a liquid"
      cy.contains('button', SetupContent.DefineALiquid).click()
      break
    case SetupActions.LiquidSaveWIP:
      cy.get(SetupLocators.LiquidNameInput) // Locate the input with name="name"
        .type(SetupContent.SampleLiquidName)

      cy.get(SetupLocators.ModalShellArea)
        .find('form') // Target the form inside the modal
        .invoke('submit', (e: SubmitEvent) => {
          e.preventDefault() // Prevent default form submission
        })

      cy.get(SetupLocators.ModalShellArea)
        .find(SetupLocators.SaveButton) // Locate the Save button
        .contains(SetupContent.Save)
        .click({ force: true }) // Trigger the Save button
      break
    case SetupActions.WellSelector:
      selectWells(['A1', 'A2'])
      break
    case SetupActions.LiquidDropdown: // New case for dropdown
      cy.get(SetupLocators.LiquidsDropdown)
        .should('be.visible') // Ensure the dropdown is visible
        .click() // Click the dropdown
      break
    case SetupActions.SelectLiquidWells:
      cy.contains('My liquid!').click() // Action for clicking 'My liquid!'
      break
    case SetupActions.SetVolumeAndSaveforWells:
      cy.get('input[name="volume"]').type(`150`, { force: true }) // Set volume
      cy.contains('button', SetupContent.Save).click() // Click Save button
      cy.contains('button', 'Done').click({ force: true }) // Click Done button, forcing click if necessary
      break
    case SetupActions.ProtocolStepsH:
      cy.contains('button', SetupContent.ProtocolSteps).click()
      break
    case SetupActions.AddStep:
      cy.contains('button', SetupContent.AddStep).click({ force: true })
      break
    case SetupActions.AddAdapters:
      cy.contains('Adapters').click()
      break
    case SetupActions.DeepWellTempModAdapter:
      cy.contains('Opentrons 96 Deep Well Temperature Module Adapter').click()
      break
    case SetupActions.AddNest96DeepWellPlate:
      cy.contains(SetupContent.NestDeepWell).click()
      break
    case SetupActions.Done:
      cy.get(SetupLocators.DoneButtonLabwareSelection)
        .contains('Done')
        .click({ force: true })
      break

    default:
      throw new Error(`Unrecognized action: ${action as string}`)
  }
}

export const executeVerificationStep = (
  verification: SetupVerifications
): void => {
  switch (verification) {
    case SetupVerifications.OnStep1:
      cy.contains(SetupContent.Step1Title).should('be.visible')
      break
    case SetupVerifications.OnStep2:
      cy.contains(SetupContent.Step2Title).should('be.visible')
      cy.contains(SetupContent.AddPipette).should('be.visible')
      break
    case SetupVerifications.FlexSelected:
      cy.contains(SetupContent.OpentronsFlex).should(
        'have.css',
        'background-color',
        'rgb(0, 108, 250)'
      )
      break
    case SetupVerifications.OT2Selected:
      cy.contains(SetupContent.OpentronsOT2).should(
        'have.css',
        'background-color',
        'rgb(0, 108, 250)'
      )
      break
    case SetupVerifications.NinetySixChannel:
      cy.contains(SetupContent.NinetySixChannel).should('be.visible')
      break
    case SetupVerifications.NotNinetySixChannel:
      cy.contains(SetupContent.NinetySixChannel).should('not.exist')
      break
    case SetupVerifications.StepTwo50uL:
      // This function should get used after you select 50uL fully
      cy.contains(SetupContent.PipetteVolume)
      cy.contains(SetupContent.Volume50).should('be.visible')
      cy.contains(SetupContent.Volume1000).should('be.visible')
      cy.contains(SetupContent.Tiprack50).should('be.visible')
      cy.contains(SetupContent.FilterTiprack50).should('be.visible')
      break
    case SetupVerifications.StepTwoPart3:
      // This function should get used after you select 50uL fully
      cy.contains(SetupContent.FullP50SingleName).should('be.visible')
      cy.contains(SetupContent.FullP50TiprackName).should('be.visible')
      cy.contains('Left Mount').should('be.visible')
      cy.contains(SetupContent.Step2Title)
      cy.contains('Robot pipettes')
      cy.contains(SetupContent.AddPipette)
      break
    case SetupVerifications.OnStep3:
      cy.contains('Add a gripper').should('be.visible')
      cy.contains(
        'Do you want to move labware automatically with the gripper?'
      ).should('be.visible')
      cy.contains(SetupContent.Yes).should('be.visible')
      cy.contains(SetupContent.No).should('be.visible')
      break
    case SetupVerifications.Step4Verification:
      cy.contains(SetupContent.ModulePageH).should('be.visible')
      cy.contains(SetupContent.ModulePageB).should('be.visible')
      cy.contains(SetupContent.Thermocycler).should('be.visible')
      cy.contains(SetupContent.HeaterShaker).should('be.visible')
      cy.contains(SetupContent.MagBlock).should('be.visible')
      cy.contains(SetupContent.Tempdeck2).should('be.visible')
      break
    case SetupVerifications.ThermocyclerImg:
      cy.get(SetupLocators.TemperatureModuleImage).should('be.visible')
      break
    case SetupVerifications.HeaterShakerImg:
      cy.get(SetupLocators.HeaterShakerImage).should('be.visible')
      break
    case SetupVerifications.Tempdeck2Img:
      cy.contains(SetupContent.Tempdeck2).should('be.visible')
      break
    case SetupVerifications.LiquidPage:
      cy.contains('Liquid').should('be.visible')
      cy.contains('Add liquid').should('be.visible')
      cy.contains('Liquid volume by well').should('be.visible')
      cy.contains('Cancel').should('be.visible')
      break
    case SetupVerifications.TransferPopOut:
      cy.contains('button', 'Transfer').should('be.visible').click()
      cy.contains('Source labware')
      cy.contains('Select source wells')
      cy.contains('Destination labware')
      cy.contains('Volume per well')
      cy.contains('Tip handling')
      cy.contains('Tip handling')
      cy.contains('Tip drop location')
      break
  }
}

export const verifyCreateProtocolPage = (): void => {
  // Verify step 1 and page SetupContent
  cy.contains(SetupContent.Step1Title).should('exist').should('be.visible')
  cy.contains(SetupContent.LetsGetStarted).should('exist').should('be.visible')
  cy.contains(SetupContent.WhatKindOfRobot).should('exist').should('be.visible')
  cy.contains(SetupContent.OpentronsFlex).should('exist').should('be.visible')
  cy.contains(SetupContent.OpentronsOT2).should('exist').should('be.visible')
  cy.contains(SetupContent.Confirm).should('exist').should('be.visible')
}
