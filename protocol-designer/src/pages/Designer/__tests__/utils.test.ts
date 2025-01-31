import { describe, it, expect } from 'vitest'
import {
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  WASTE_CHUTE_CUTOUT,
  fixture96Plate,
} from '@opentrons/shared-data'
import { getSlotInformation } from '../utils'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { AdditionalEquipmentName } from '@opentrons/step-generation'
import type { AllTemporalPropertiesForTimelineFrame } from '../../../step-forms'

const mockLabOnDeck1 = {
  slot: 'mockHsId',
  id: 'labId',
  labwareDefURI: 'mockUri',
  def: fixture96Plate as LabwareDefinition2,
}
const mockLabOnDeck2 = {
  slot: 'labId',
  id: 'labId2',
  labwareDefURI: 'mockUri2',
  def: fixture96Plate as LabwareDefinition2,
}
const mockLabOnDeck3 = {
  slot: '2',
  id: 'labId3',
  labwareDefURI: 'mockUri3',
  def: fixture96Plate as LabwareDefinition2,
}
const mockHS = {
  id: 'mockHsId',
  model: HEATERSHAKER_MODULE_V1,
  type: HEATERSHAKER_MODULE_TYPE,
  slot: '1',
  moduleState: {} as any,
}

const mockOt2DeckSetup: AllTemporalPropertiesForTimelineFrame = {
  labware: {
    labId: mockLabOnDeck1,
    lab2: mockLabOnDeck2,
    lab3: mockLabOnDeck3,
  },
  pipettes: {},
  modules: {
    hs: mockHS,
    temp: {
      id: 'mockTempId',
      model: TEMPERATURE_MODULE_V1,
      type: TEMPERATURE_MODULE_TYPE,
      slot: '3',
      moduleState: {} as any,
    },
  },
  additionalEquipmentOnDeck: {
    trash: { name: 'trashBin', id: 'mockTrashId', location: '12' },
  },
}

const mockLabOnStagingArea = {
  slot: 'D4',
  id: 'labId3',
  labwareDefURI: 'mockUri3',
  def: fixture96Plate as LabwareDefinition2,
}
const mockHSFlex = {
  id: 'mockHsId',
  model: HEATERSHAKER_MODULE_V1,
  type: HEATERSHAKER_MODULE_TYPE,
  slot: 'D1',
  moduleState: {} as any,
}
const mockTrash = {
  name: 'trashBin' as AdditionalEquipmentName,
  id: 'mockTrashId',
  location: 'cutoutA3',
}
const mockWasteChute = {
  name: 'wasteChute' as AdditionalEquipmentName,
  id: 'mockWasteChuteId',
  location: WASTE_CHUTE_CUTOUT,
}
const mockStagingArea = {
  name: 'stagingArea' as AdditionalEquipmentName,
  id: 'mockStagingAreaId',
  location: WASTE_CHUTE_CUTOUT,
}
const mockFlex2DeckSetup: AllTemporalPropertiesForTimelineFrame = {
  labware: {
    labId: mockLabOnDeck1,
    lab2: mockLabOnDeck2,
    lab3: mockLabOnStagingArea,
  },
  pipettes: {},
  modules: {
    hs: mockHSFlex,
    temp: {
      id: 'mockTempId',
      model: TEMPERATURE_MODULE_V1,
      type: TEMPERATURE_MODULE_TYPE,
      slot: 'C1',
      moduleState: {} as any,
    },
  },
  additionalEquipmentOnDeck: {
    trash: mockTrash,
    wasteChute: mockWasteChute,
    stagingArea: mockStagingArea,
  },
}

describe('getSlotInformation', () => {
  it('renders a heater-shaker with a labware and nested labware for an ot-2 in slot 1 with other mods added', () => {
    expect(
      getSlotInformation({ deckSetup: mockOt2DeckSetup, slot: '1' })
    ).toEqual({
      matchingLabwareFor4thColumn: null,
      createdModuleForSlot: mockHS,
      createdLabwareForSlot: mockLabOnDeck1,
      createdNestedLabwareForSlot: mockLabOnDeck2,
      createFixtureForSlots: [],
      slotPosition: null,
    })
  })
  it('renders only a labware for ot-2 on slot 2', () => {
    expect(
      getSlotInformation({ deckSetup: mockOt2DeckSetup, slot: '2' })
    ).toEqual({
      matchingLabwareFor4thColumn: null,
      createdLabwareForSlot: mockLabOnDeck3,
      createFixtureForSlots: [],
      slotPosition: null,
    })
  })
  it('renders no items on the slot for a flex', () => {
    const mockDeckSetup: AllTemporalPropertiesForTimelineFrame = {
      labware: {},
      pipettes: {},
      modules: {},
      additionalEquipmentOnDeck: {},
    }
    expect(
      getSlotInformation({ deckSetup: mockDeckSetup, slot: 'A1' })
    ).toEqual({
      matchingLabwareFor4thColumn: null,
      slotPosition: null,
      createFixtureForSlots: [],
    })
  })
  it('renders a trashbin for a Flex on slot A3', () => {
    expect(
      getSlotInformation({ deckSetup: mockFlex2DeckSetup, slot: 'A3' })
    ).toEqual({
      matchingLabwareFor4thColumn: null,
      slotPosition: null,
      createFixtureForSlots: [mockTrash],
      preSelectedFixture: 'trashBin',
    })
  })
  it('renders a h-s, labware and nested labware for a Flex on slot D1', () => {
    expect(
      getSlotInformation({ deckSetup: mockFlex2DeckSetup, slot: 'D1' })
    ).toEqual({
      matchingLabwareFor4thColumn: null,
      slotPosition: null,
      createdModuleForSlot: mockHSFlex,
      createdLabwareForSlot: mockLabOnDeck1,
      createdNestedLabwareForSlot: mockLabOnDeck2,
      createFixtureForSlots: [],
    })
  })
  it('renders the waste chute and staging area for slot D3 for Flex', () => {
    expect(
      getSlotInformation({ deckSetup: mockFlex2DeckSetup, slot: 'D3' })
    ).toEqual({
      matchingLabwareFor4thColumn: mockLabOnStagingArea,
      slotPosition: null,
      createFixtureForSlots: [mockWasteChute, mockStagingArea],
      preSelectedFixture: 'wasteChuteAndStagingArea',
    })
  })
  it('renders the staging area with waste chute and labware in slot D4 for flex', () => {
    expect(
      getSlotInformation({ deckSetup: mockFlex2DeckSetup, slot: 'D4' })
    ).toEqual({
      matchingLabwareFor4thColumn: null,
      slotPosition: null,
      createdLabwareForSlot: mockLabOnStagingArea,
      createFixtureForSlots: [mockWasteChute, mockStagingArea],
      preSelectedFixture: 'wasteChuteAndStagingArea',
    })
  })
})
