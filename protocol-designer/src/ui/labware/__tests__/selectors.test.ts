import { describe, expect, it, beforeEach } from 'vitest'
import {
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'
import {
  getDisposalOptions,
  getLabwareOptions,
  _sortLabwareDropdownOptions,
} from '../selectors'
import {
  fixture_tiprack_1000_ul,
  fixture_tiprack_10_ul,
  fixture_96_plate,
  fixture_trash,
} from '@opentrons/shared-data/labware/fixtures/2'

import type { LabwareEntities } from '@opentrons/step-generation'

describe('labware selectors', () => {
  let names: Record<string, string>
  let tipracks: LabwareEntities
  let trash: LabwareEntities
  let otherLabware: LabwareEntities

  const mockTrash = 'mockTrash'
  const mockTrash2 = 'mockTrash2'
  beforeEach(() => {
    trash = {
      [mockTrash]: {
        def: fixture_trash,
      } as any,
    }

    tipracks = {
      tiprack100Id: {
        id: 'tiprack100Id',
        def: fixture_tiprack_1000_ul,
      } as any,
      tiprack10Id: {
        id: 'tiprack10Id',
        def: fixture_tiprack_10_ul,
      } as any,
    }

    otherLabware = {
      wellPlateId: {
        id: 'wellPlateId',
        def: fixture_96_plate,
      } as any,
    }

    names = {
      [mockTrash]: 'Trash',
      [mockTrash2]: 'Trash',

      tiprack100Id: 'Opentrons Tip Rack 1000 µL',
      tiprack10Id: 'Opentrons Tip Rack 10 µL',

      wellPlateId: 'Source Plate',
    }
  })

  describe('getDisposalOptions', () => {
    it('returns an empty list when additionalEquipment is NOT provided', () => {
      expect(getDisposalOptions.resultFunc({}, null)).toEqual([])
    })
    it('returns empty list when trash bin is NOT present', () => {
      const additionalEquipmentEntities = {
        stagingArea: {
          name: 'stagingArea' as const,
          location: 'cutoutB3',
          id: 'stagingAreaId',
        },
      }
      expect(
        getDisposalOptions.resultFunc(additionalEquipmentEntities, null)
      ).toEqual([])
    })
    it('filters out additional equipment that is not trash when a trash is present', () => {
      const mockTrashId = 'mockTrashId'
      const additionalEquipmentEntities = {
        stagingArea: {
          name: 'stagingArea',
          location: 'cutoutB3',
          id: 'staginAreaId',
        },
        [mockTrashId]: {
          name: 'trashBin',
          location: 'cutoutA3',
          id: mockTrashId,
        },
      }

      expect(
        // @ts-expect-error(sa, 2021-6-15): resultFunc
        getDisposalOptions.resultFunc(additionalEquipmentEntities)
      ).toEqual([{ name: 'Trash bin', value: mockTrashId }])
    })
    it('filters out additional equipment that is NOT trash when multiple trash bins present', () => {
      const mockTrashId = 'mockTrashId'
      const mockTrashId2 = 'mockTrashId2'
      const additionalEquipmentEntities = {
        stagingArea: {
          name: 'stagingArea',
          location: 'cutoutB3',
          id: 'staginAreaId',
        },
        [mockTrashId]: {
          name: 'trashBin',
          location: 'cutoutA3',
          id: mockTrashId,
        },
        [mockTrashId2]: {
          name: 'trashBin',
          location: 'cutoutA1',
          id: mockTrashId2,
        },
      }

      expect(
        // @ts-expect-error(sa, 2021-6-15): resultFunc
        getDisposalOptions.resultFunc(additionalEquipmentEntities)
      ).toEqual([
        { name: 'Trash bin', value: mockTrashId },
        { name: 'Trash bin', value: mockTrashId2 },
      ])
    })
  })

  describe('getLabwareOptions', () => {
    it('should return an empty list when no labware is present', () => {
      expect(
        // @ts-expect-error(sa, 2021-6-15): resultFunc
        getLabwareOptions.resultFunc(
          {},
          {},
          {
            labware: {},
            modules: {},
            pipettes: {},
            additionalEquipmentOnDeck: {},
          },
          {},
          {},
          {}
        )
      ).toEqual([])
    })

    it('should return labware options when no modules are present, with no tipracks', () => {
      const labwareEntities = {
        ...tipracks,
        ...otherLabware,
      }
      const initialDeckSetup = {
        labware: labwareEntities,
        modules: {},
        pipettes: {},
        additionalEquipmentOnDeck: {},
      }
      expect(
        // @ts-expect-error(sa, 2021-6-15): resultFunc
        getLabwareOptions.resultFunc(
          labwareEntities,
          names,
          initialDeckSetup,
          {},
          {},
          {}
        )
      ).toEqual([{ name: 'Source Plate', value: 'wellPlateId' }])
    })

    it('should return labware options with no module prefixes even when a labware is on module', () => {
      const labware = {
        wellPlateId: {
          ...otherLabware.wellPlateId,
          slot: 'magModuleId', // On magnetic module
        },
        tempPlateId: {
          ...otherLabware.wellPlateId,
          id: 'tempPlateId',
          slot: 'tempModuleId', // On temperature module
        },
        tcPlateId: {
          ...otherLabware.wellPlateId,
          id: 'tcPlateId',
          slot: 'thermocyclerId', // On thermocycler
        },
        hsPlateId: {
          ...otherLabware.wellPlateId,
          id: 'hsPlateId',
          slot: 'heaterShakerId', // On heater-shaker
        },
      }
      const labwareEntities = { ...trash, ...labware }
      const initialDeckSetup = {
        pipettes: {},
        labware: {
          ...trash,
          ...labware,
        },
        additionalEquipmentOnDeck: {
          trash: { id: 'trash', location: 'cutout12', name: 'trashBin' },
        },
        modules: {
          magModuleId: {
            id: 'magModuleId',
            type: MAGNETIC_MODULE_TYPE,
            model: MAGNETIC_MODULE_V1,
            slot: '1',
          },
          tempModuleId: {
            id: 'tempModuleId',
            type: TEMPERATURE_MODULE_TYPE,
            model: TEMPERATURE_MODULE_V1,
            slot: '3',
          },
          thermocyclerId: {
            id: 'thermocyclerId',
            type: THERMOCYCLER_MODULE_TYPE,
            model: THERMOCYCLER_MODULE_V1,
            slot: '8',
          },
          heaterShakerId: {
            id: 'heaterShakerId',
            type: HEATERSHAKER_MODULE_TYPE,
            model: HEATERSHAKER_MODULE_V1,
            slot: '6',
          },
        },
      }

      const nicknames: Record<string, string> = {
        ...names,
        wellPlateId: 'Well Plate',
        tempPlateId: 'Temp Plate',
        tcPlateId: 'TC Plate',
        hsPlateId: 'HS Plate',
      }

      expect(
        // @ts-expect-error(sa, 2021-6-15): resultFunc
        getLabwareOptions.resultFunc(
          labwareEntities,
          nicknames,
          initialDeckSetup,
          {},
          {},
          {}
        )
      ).toEqual([
        { name: 'HS Plate in 6', value: 'hsPlateId' },
        { name: 'TC Plate in A1+B1', value: 'tcPlateId' },
        { name: 'Temp Plate in 3', value: 'tempPlateId' },
        { name: 'Trash', value: mockTrash },
        { name: 'Well Plate in 1', value: 'wellPlateId' },
      ])
    })

    it('should return labware options with a labware moved off of the initial module slot', () => {
      const labware = {
        wellPlateId: {
          ...otherLabware.wellPlateId,
          slot: 'magModuleId', // On magnetic module
        },
      }
      const labwareEntities = { ...trash, ...labware }
      const initialDeckSetup = {
        pipettes: {},
        labware: {
          ...labware,
        },
        modules: {
          magModuleId: {
            id: 'magModuleId',
            type: MAGNETIC_MODULE_TYPE,
            model: MAGNETIC_MODULE_V1,
            slot: '1',
          },
        },
        additionalEquipmentOnDeck: {
          trash: { id: 'trash', name: 'trashBin', location: 'cutout12' },
        },
      }

      const nicknames: Record<string, string> = {
        ...names,
        wellPlateId: 'Well Plate',
      }
      const mockId = 'mockId'

      const savedStep = {
        [mockId]: {
          stepType: 'moveLabware',
          id: mockId,
          labware: 'wellPlateId',
          newLocation: '2',
        },
      }

      expect(
        // @ts-expect-error(sa, 2021-6-15): resultFunc
        getLabwareOptions.resultFunc(
          labwareEntities,
          nicknames,
          initialDeckSetup,
          {},
          savedStep,
          {}
        )
      ).toEqual([
        { name: 'Trash', value: mockTrash },
        { name: 'Well Plate in 1', value: 'wellPlateId' },
      ])
    })
  })

  describe('_sortLabwareDropdownOptions', () => {
    const trashOption = {
      name: 'Trash bin',
      value: mockTrash,
    }
    const zzzPlateOption = { name: 'Zzz Plate', value: 'zzz' }
    const aaaPlateOption = { name: 'Aaa Plate', value: 'aaa' }
    it('should sort labware ids in alphabetical order but with fixed trash at the bottom', () => {
      const result = _sortLabwareDropdownOptions([
        aaaPlateOption,
        zzzPlateOption,
        trashOption,
      ])
      expect(result).toEqual([aaaPlateOption, zzzPlateOption, trashOption])
    })

    it('should handle {} case', () => {
      const result = _sortLabwareDropdownOptions([])
      expect(result).toEqual([])
    })

    it('should handle case w/o non-trash labware', () => {
      const result = _sortLabwareDropdownOptions([trashOption])
      expect(result).toEqual([trashOption])
    })
  })
})
