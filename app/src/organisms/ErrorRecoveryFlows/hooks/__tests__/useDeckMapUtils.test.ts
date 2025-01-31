import { describe, it, expect, beforeEach, vi } from 'vitest'

import {
  getLoadedLabwareDefinitionsByUri,
  getPositionFromSlotId,
  fixture96Plate,
  TEMPERATURE_MODULE_V2,
  getModuleDef2,
} from '@opentrons/shared-data'

import { mockPickUpTipLabware } from '../../__fixtures__'
import { getLabwareLocation } from '/app/local-resources/labware'
import {
  getIsLabwareMatch,
  getSlotNameAndLwLocFrom,
  getRunCurrentLabwareInfo,
  getRunCurrentModulesInfo,
  getRunCurrentLabwareOnDeck,
  getRunCurrentModulesOnDeck,
  updateLabwareInModules,
} from '../useDeckMapUtils'

import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getLoadedLabwareDefinitionsByUri>()
  return {
    ...actual,
    getLoadedLabwareDefinitionsByUri: vi.fn(),
    getPositionFromSlotId: vi.fn(),
    getModuleDef2: vi.fn(),
  }
})
vi.mock('/app/local-resources/labware')

describe('getRunCurrentModulesOnDeck', () => {
  const mockLabwareDef: LabwareDefinition2 = {
    ...(fixture96Plate as LabwareDefinition2),
    metadata: {
      displayName: 'Mock Labware Definition',
      displayCategory: 'wellPlate',
      displayVolumeUnits: 'mL',
    },
  }
  const mockFailedLabwareUtils = {
    failedLabware: mockPickUpTipLabware,
  } as any
  const mockModuleDef = { model: 'MOCK_MODEL' } as any
  const mockCurrentModulesInfo = [
    {
      moduleId: 'MOCK_PickUpTipLabware_ID',
      moduleDef: mockModuleDef,
      slotName: 'A1',
      nestedLabwareDef: mockLabwareDef,
      nestedLabwareSlotName: 'A1',
    },
  ]

  beforeEach(() => {
    vi.mocked(getModuleDef2).mockReturnValue({ model: 'MOCK_MODEL' } as any)
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
  })

  it('should return an array of RunCurrentModulesOnDeck objects', () => {
    const mockPickUpTipLabwareSameSlot = {
      failedLabware: {
        ...mockPickUpTipLabware,
        location: { moduleId: 'MOCK_MODULE_ID' },
      },
    } as any
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })

    const result = getRunCurrentModulesOnDeck({
      failedLabwareUtils: mockPickUpTipLabwareSameSlot,
      runRecord: {} as any,
      currentModulesInfo: mockCurrentModulesInfo,
    })

    expect(result).toEqual([
      {
        moduleModel: 'MOCK_MODEL',
        moduleLocation: { slotName: 'A1' },
        innerProps: {},
        nestedLabwareDef: mockLabwareDef,
        highlight: 'A1',
      },
    ])
  })
  it('should set highlight to null if getIsLabwareMatch returns false', () => {
    const result = getRunCurrentModulesOnDeck({
      failedLabwareUtils: mockFailedLabwareUtils,
      runRecord: {} as any,
      currentModulesInfo: [
        {
          ...mockCurrentModulesInfo[0],
          nestedLabwareSlotName: 'MOCK_MODULE_ID_2',
        },
      ],
    })

    expect(result[0].highlight).toBeNull()
  })

  it('should set highlight to null if nestedLabwareDef is null', () => {
    vi.mocked(getLabwareLocation).mockReturnValue(null)

    const result = getRunCurrentModulesOnDeck({
      failedLabwareUtils: mockFailedLabwareUtils,
      runRecord: {} as any,
      currentModulesInfo: [
        { ...mockCurrentModulesInfo[0], nestedLabwareDef: null },
      ],
    })

    expect(result[0].highlight).toBeNull()
  })
})

describe('getRunCurrentLabwareOnDeck', () => {
  const mockLabwareDef: LabwareDefinition2 = {
    ...(fixture96Plate as LabwareDefinition2),
    metadata: {
      displayName: 'Mock Labware Definition',
      displayCategory: 'wellPlate',
      displayVolumeUnits: 'mL',
    },
  }

  const mockCurrentLabwareInfo = {
    labwareDef: mockLabwareDef,
    labwareLocation: { slotName: 'A1' },
    slotName: 'A1',
  }
  const mockFailedLabwareUtils = {
    failedLabware: { ...mockPickUpTipLabware, location: { slotName: 'A1' } },
  } as any

  it('should return a valid RunCurrentLabwareOnDeck with a labware highlight if the labware is the pickUpTipLabware', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getRunCurrentLabwareOnDeck({
      currentLabwareInfo: [mockCurrentLabwareInfo],
      runRecord: {} as any,
      failedLabwareUtils: mockFailedLabwareUtils,
    })

    expect(result).toEqual([
      {
        labwareLocation: { slotName: 'A1' },
        definition: mockLabwareDef,
        highlight: 'A1',
      },
    ])
  })

  it('should set highlight to null if getIsLabwareMatch returns false', () => {
    vi.mocked(getLabwareLocation).mockReturnValue(null)
    const result = getRunCurrentLabwareOnDeck({
      failedLabwareUtils: {
        ...mockFailedLabwareUtils,
        failedLabware: {
          ...mockPickUpTipLabware,
          location: { slotName: 'B1' },
        },
      },
      runRecord: {} as any,
      currentLabwareInfo: [mockCurrentLabwareInfo],
    })

    expect(result[0].highlight).toBeNull()
  })
})

describe('getRunCurrentModulesInfo', () => {
  const mockModule = {
    model: TEMPERATURE_MODULE_V2,
    id: 'MOCK_MODULE_ID',
    location: { slotName: 'A1' },
  }
  const mockRunRecord = {
    data: {
      modules: [mockModule],
      labware: [
        { ...mockPickUpTipLabware, location: { moduleId: 'MOCK_MODULE_ID' } },
      ],
    },
  } as any
  const mockDeckDef = {} as any

  beforeEach(() => {
    vi.mocked(getLoadedLabwareDefinitionsByUri).mockReturnValue({
      'opentrons/opentrons_96_pcr_adapter/1': 'MOCK_LW_DEF',
    } as any)
    vi.mocked(getPositionFromSlotId).mockReturnValue('position' as any)
    vi.mocked(getModuleDef2).mockReturnValue('MOCK_MODULE_DEF' as any)
  })

  it('should return an empty array if runRecord is null', () => {
    const result = getRunCurrentModulesInfo({
      runRecord: null as any,
      deckDef: mockDeckDef,
      runLwDefsByUri: {},
    })

    expect(result).toEqual([])
  })

  it('should return an array of RunCurrentModuleInfo objects for each module in runRecord.data.modules', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getRunCurrentModulesInfo({
      runRecord: mockRunRecord,
      deckDef: mockDeckDef,
      runLwDefsByUri: {
        'opentrons/opentrons_96_pcr_adapter/1': 'MOCK_LW_DEF',
      } as any,
    })

    expect(result).toEqual([
      {
        moduleId: mockModule.id,
        moduleDef: 'MOCK_MODULE_DEF',
        nestedLabwareDef: 'MOCK_LW_DEF',
        nestedLabwareSlotName: 'A1',
        slotName: mockModule.location.slotName,
      },
    ])
  })

  it('should set nestedLabwareDef to null if there is no nested labware on the module', () => {
    const result = getRunCurrentModulesInfo({
      runRecord: {
        ...mockRunRecord,
        data: { modules: [mockModule], labware: [] },
      },
      deckDef: mockDeckDef,
      runLwDefsByUri: {},
    })
    expect(result).toEqual([
      {
        moduleId: mockModule.id,
        moduleDef: 'MOCK_MODULE_DEF',
        nestedLabwareDef: null,
        nestedLabwareSlotName: '',
        slotName: mockModule.location.slotName,
      },
    ])
  })

  it('should exclude modules if getPositionFromSlotId returns null', () => {
    vi.mocked(getPositionFromSlotId).mockReturnValueOnce(null)

    const result = getRunCurrentModulesInfo({
      runRecord: mockRunRecord,
      deckDef: mockDeckDef,
      runLwDefsByUri: {},
    })
    expect(result).toEqual([])
  })
})

describe('getRunCurrentLabwareInfo', () => {
  const mockLabwareDef: LabwareDefinition2 = {
    ...(fixture96Plate as LabwareDefinition2),
    metadata: {
      displayName: 'Mock Labware Definition',
      displayCategory: 'wellPlate',
      displayVolumeUnits: 'mL',
    },
  }

  beforeEach(() => {
    vi.mocked(getLoadedLabwareDefinitionsByUri).mockReturnValue({
      'opentrons/opentrons_96_pcr_adapter/1': mockLabwareDef,
    })
  })

  it('should return an empty array if runRecord is null', () => {
    const result = getRunCurrentLabwareInfo({
      runRecord: undefined,
      runLwDefsByUri: {} as any,
    })

    expect(result).toEqual([])
  })

  it('should return an empty array if protocolAnalysis is null', () => {
    const result = getRunCurrentLabwareInfo({
      runRecord: { data: { labware: [] } } as any,
      runLwDefsByUri: {},
    })

    expect(result).toEqual([])
  })

  it('should return an array of RunCurrentLabwareInfo objects for each labware in runRecord.data.labware', () => {
    const mockPickUpTipLwSlotName = {
      ...mockPickUpTipLabware,
      location: { slotName: 'A1' },
    }

    const result = getRunCurrentLabwareInfo({
      runRecord: { data: { labware: [mockPickUpTipLwSlotName] } } as any,
      runLwDefsByUri: {
        [mockPickUpTipLabware.definitionUri]: mockLabwareDef,
      },
    })

    expect(result).toEqual([
      {
        labwareDef: mockLabwareDef,
        slotName: 'A1',
        labwareLocation: { slotName: 'A1' },
      },
    ])
  })
})

describe('getSlotNameAndLwLocFrom', () => {
  it('should return [null, null] if location is null', () => {
    const result = getSlotNameAndLwLocFrom(null, {} as any, false)
    expect(result).toEqual([null, null])
  })

  it('should return [null, null] if location is "offDeck"', () => {
    const result = getSlotNameAndLwLocFrom('offDeck', {} as any, false)
    expect(result).toEqual([null, null])
  })

  it('should return [null, null] if location has a moduleId and excludeModules is true', () => {
    const result = getSlotNameAndLwLocFrom(
      { moduleId: 'MOCK_MODULE_ID' },
      {} as any,
      true
    )
    expect(result).toEqual([null, null])
  })

  it('should return [baseSlot, { moduleId }] if location has a moduleId and excludeModules is false', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getSlotNameAndLwLocFrom(
      { moduleId: 'MOCK_MODULE_ID' },
      {} as any,
      false
    )
    expect(result).toEqual(['A1', { moduleId: 'MOCK_MODULE_ID' }])
  })

  it('should return [baseSlot, { labwareId }] if location has a labwareId', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getSlotNameAndLwLocFrom(
      { labwareId: 'MOCK_LW_ID' },
      {} as any,
      false
    )
    expect(result).toEqual(['A1', { labwareId: 'MOCK_LW_ID' }])
  })

  it('should return [addressableAreaName, { addressableAreaName }] if location has an addressableAreaName', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getSlotNameAndLwLocFrom(
      { addressableAreaName: 'A1' },
      {} as any,
      false
    )
    expect(result).toEqual(['A1', { addressableAreaName: 'A1' }])
  })

  it('should return [slotName, { slotName }] if location has a slotName', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getSlotNameAndLwLocFrom({ slotName: 'A1' }, {} as any, false)
    expect(result).toEqual(['A1', { slotName: 'A1' }])
  })

  it('should return [null, null] if location does not match any known location type', () => {
    const result = getSlotNameAndLwLocFrom(
      { unknownProperty: 'MOCK_VALUE' } as any,
      {} as any,
      false
    )
    expect(result).toEqual([null, null])
  })
})

describe('getIsLabwareMatch', () => {
  beforeEach(() => {
    vi.mocked(getLabwareLocation).mockReturnValue(null)
  })

  it('should return false if pickUpTipLabware is null', () => {
    const result = getIsLabwareMatch('A1', {} as any, null)
    expect(result).toBe(false)
  })

  it('should return false if pickUpTipLabware location is a string', () => {
    const result = getIsLabwareMatch(
      'offdeck',
      {} as any,
      { location: 'offdeck' } as any
    )
    expect(result).toBe(false)
  })

  it('should return false if pickUpTipLabware location has a moduleId', () => {
    const result = getIsLabwareMatch(
      'A1',
      {} as any,
      {
        location: { moduleId: 'MOCK_MODULE_ID' },
      } as any
    )
    expect(result).toBe(false)
  })

  it('should return true if pickUpTipLabware location slotName matches the provided slotName', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'A1' })
    const result = getIsLabwareMatch(
      'A1',
      {} as any,
      {
        location: { slotName: 'A1' },
      } as any
    )
    expect(result).toBe(true)
  })

  it('should return false if pickUpTipLabware location slotName does not match the provided slotName', () => {
    const result = getIsLabwareMatch(
      'A1',
      {} as any,
      {
        location: { slotName: 'A2' },
      } as any
    )
    expect(result).toBe(false)
  })

  it('should return true if pickUpTipLabware location labwareId matches the provided slotName', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'C1' })

    const result = getIsLabwareMatch(
      'C1',
      {} as any,
      {
        location: { labwareId: 'lwId' },
      } as any
    )
    expect(result).toBe(true)
  })

  it('should return false if pickUpTipLabware location labwareId does not match the provided slotName', () => {
    const result = getIsLabwareMatch(
      'lwId',
      {} as any,
      {
        location: { labwareId: 'lwId2' },
      } as any
    )
    expect(result).toBe(false)
  })

  it('should return true if pickUpTipLabware location addressableAreaName matches the provided slotName', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ slotName: 'B1' })

    const slotName = 'B1'
    const pickUpTipLabware = {
      location: { addressableAreaName: 'B1' },
    } as any
    const result = getIsLabwareMatch(slotName, {} as any, pickUpTipLabware)
    expect(result).toBe(true)
  })

  it('should return false if pickUpTipLabware location addressableAreaName does not match the provided slotName', () => {
    const slotName = 'A1'
    const pickUpTipLabware = {
      location: { addressableAreaName: 'B2' },
    } as any
    const result = getIsLabwareMatch(slotName, {} as any, pickUpTipLabware)
    expect(result).toBe(false)
  })

  it('should return false if pickUpTipLabware location does not match any known location type', () => {
    const slotName = 'A1'
    const pickUpTipLabware = {
      location: { unknownProperty: 'someValue' },
    } as any
    const result = getIsLabwareMatch(slotName, {} as any, pickUpTipLabware)
    expect(result).toBe(false)
  })
})

describe('updateLabwareInModules', () => {
  const mockLabwareDef: LabwareDefinition2 = {
    ...(fixture96Plate as LabwareDefinition2),
    metadata: {
      displayName: 'Mock Labware Definition',
      displayCategory: 'wellPlate',
      displayVolumeUnits: 'mL',
    },
  }

  const mockModule = {
    moduleModel: 'temperatureModuleV2',
    moduleLocation: { slotName: 'A1' },
    innerProps: {},
    nestedLabwareDef: null,
    highlight: null,
  } as any

  const mockLabware = {
    labwareDef: mockLabwareDef,
    labwareLocation: { slotName: 'A1' },
    slotName: 'A1',
  }

  it('should update module with nested labware when they share the same slot', () => {
    const result = updateLabwareInModules({
      runCurrentModules: [mockModule],
      currentLabwareInfo: [mockLabware],
    })

    expect(result.updatedModules).toEqual([
      {
        ...mockModule,
        nestedLabwareDef: mockLabwareDef,
      },
    ])
    expect(result.remainingLabware).toEqual([])
  })

  it('should keep labware separate when slots do not match', () => {
    const labwareInDifferentSlot = {
      ...mockLabware,
      labwareLocation: { slotName: 'B1' },
      slotName: 'B1',
    }

    const result = updateLabwareInModules({
      runCurrentModules: [mockModule],
      currentLabwareInfo: [labwareInDifferentSlot],
    })

    expect(result.updatedModules).toEqual([mockModule])
    expect(result.remainingLabware).toEqual([labwareInDifferentSlot])
  })

  it('should handle multiple modules and labware', () => {
    const mockModuleB1 = {
      ...mockModule,
      moduleLocation: { slotName: 'B1' },
    }

    const labwareB1 = {
      ...mockLabware,
      labwareLocation: { slotName: 'B1' },
      slotName: 'B1',
    }

    const labwareC1 = {
      ...mockLabware,
      labwareLocation: { slotName: 'C1' },
      slotName: 'C1',
    }

    const result = updateLabwareInModules({
      runCurrentModules: [mockModule, mockModuleB1],
      currentLabwareInfo: [mockLabware, labwareB1, labwareC1],
    })

    expect(result.updatedModules).toEqual([
      {
        ...mockModule,
        nestedLabwareDef: mockLabwareDef,
      },
      {
        ...mockModuleB1,
        nestedLabwareDef: mockLabwareDef,
      },
    ])
    expect(result.remainingLabware).toEqual([labwareC1])
  })

  it('should handle empty modules array', () => {
    const result = updateLabwareInModules({
      runCurrentModules: [],
      currentLabwareInfo: [mockLabware],
    })

    expect(result.updatedModules).toEqual([])
    expect(result.remainingLabware).toEqual([mockLabware])
  })

  it('should handle empty labware array', () => {
    const result = updateLabwareInModules({
      runCurrentModules: [mockModule],
      currentLabwareInfo: [],
    })

    expect(result.updatedModules).toEqual([mockModule])
    expect(result.remainingLabware).toEqual([])
  })

  it('should handle multiple labware in same slot, nesting only one with module', () => {
    const labwareA1Second = {
      ...mockLabware,
      labwareDef: {
        ...mockLabwareDef,
        metadata: {
          ...mockLabwareDef.metadata,
          displayName: 'Second Labware',
        },
      },
    }

    const result = updateLabwareInModules({
      runCurrentModules: [mockModule],
      currentLabwareInfo: [mockLabware, labwareA1Second],
    })

    expect(result.updatedModules).toEqual([
      {
        ...mockModule,
        nestedLabwareDef: mockLabwareDef,
      },
    ])
    expect(result.remainingLabware).toEqual([])
  })

  it('should preserve module properties when updating with nested labware', () => {
    const moduleWithProperties = {
      ...mockModule,
      innerProps: { lidMotorState: 'open' },
      highlight: 'someHighlight',
    }

    const result = updateLabwareInModules({
      runCurrentModules: [moduleWithProperties],
      currentLabwareInfo: [mockLabware],
    })

    expect(result.updatedModules).toEqual([
      {
        ...moduleWithProperties,
        nestedLabwareDef: mockLabwareDef,
      },
    ])
  })
})
