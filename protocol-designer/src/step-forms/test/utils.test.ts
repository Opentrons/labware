import { describe, it, expect } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import { getIdsInRange, getUnoccupiedSlotForTrash } from '../utils'
import type { AddressableAreaName, CreateCommand } from '@opentrons/shared-data'

describe('getIdsInRange', () => {
  it('gets id in array of length 1', () => {
    expect(getIdsInRange(['X'], 'X', 'X')).toEqual(['X'])
  })
  it('gets ids in array of length > 1', () => {
    const orderedIds = ['T', 'E', 'S', 'TTT', 'C', 'A', 'SSS', 'EEE']
    // includes first element
    expect(getIdsInRange(orderedIds, 'T', 'C')).toEqual([
      'T',
      'E',
      'S',
      'TTT',
      'C',
    ])
    // middle
    expect(getIdsInRange(orderedIds, 'S', 'A')).toEqual(['S', 'TTT', 'C', 'A'])
    // includes last element
    expect(getIdsInRange(orderedIds, 'S', 'EEE')).toEqual([
      'S',
      'TTT',
      'C',
      'A',
      'SSS',
      'EEE',
    ])
    // startId same as endId
    expect(getIdsInRange(orderedIds, 'T', 'T')).toEqual(['T'])
  })
})
describe('getUnoccupiedSlotForTrash', () => {
  it('returns slot C1 when all other slots are occupied by modules, labware, moveLabware, and staging areas', () => {
    const mockPDFile: any = {
      commands: [
        {
          key: '7353ae60-c85e-45c4-8d69-59ff3a97debd',
          commandType: 'loadModule',
          params: {
            model: 'thermocyclerModuleV2',
            location: { slotName: 'B1' },
            moduleId:
              '771f390f-01a9-4615-9c4e-4dbfc95844b5:thermocyclerModuleType',
          },
        },
        {
          key: '82e5d08f-ceae-4eb8-8600-b61a973d47d9',
          commandType: 'loadModule',
          params: {
            model: 'heaterShakerModuleV1',
            location: { slotName: 'D1' },
            moduleId:
              'b9df03af-3844-4ae8-a1cf-cae61a6b4992:heaterShakerModuleType',
          },
        },
        {
          key: '49bc2a29-a7d2-42a6-8610-e07a9ad166df',
          commandType: 'loadModule',
          params: {
            model: 'temperatureModuleV2',
            location: { slotName: 'D3' },
            moduleId:
              '52bea856-eea6-473c-80df-b316f3559692:temperatureModuleType',
          },
        },
        {
          key: '864fadd7-f2c1-400a-b2ef-24d0c887a3c8',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Tip Rack 50 µL',
            labwareId:
              '88881828-037c-4445-ba57-121164f4a53a:opentrons/opentrons_flex_96_tiprack_50ul/1',
            loadName: 'opentrons_flex_96_tiprack_50ul',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'C2' },
          },
        },
        {
          key: '79994418-d664-4884-9441-4b0fa62bd143',
          commandType: 'loadLabware',
          params: {
            displayName: 'Bio-Rad 96 Well Plate 200 µL PCR',
            labwareId:
              '733c04a8-ae8c-449f-a1f9-ca3783fdda58:opentrons/biorad_96_wellplate_200ul_pcr/2',
            loadName: 'biorad_96_wellplate_200ul_pcr',
            namespace: 'opentrons',
            version: 2,
            location: { addressableAreaName: 'A4' },
          },
        },
        {
          key: 'b2170a2c-d202-4129-9cd7-ffa4e35d57bb',
          commandType: 'loadLabware',
          params: {
            displayName: 'Corning 24 Well Plate 3.4 mL Flat',
            labwareId:
              '32e97c67-866e-4153-bcb7-2b86b1d3f1fe:opentrons/corning_24_wellplate_3.4ml_flat/2',
            loadName: 'corning_24_wellplate_3.4ml_flat',
            namespace: 'opentrons',
            version: 2,
            location: { slotName: 'B3' },
          },
        },
        {
          key: 'fb1807fe-ca16-4f75-b44d-803d704c7d98',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Tip Rack 50 µL',
            labwareId:
              '11fdsa8b1-bf4b-4a6c-80cb-b8e5bdfe309b:opentrons/opentrons_flex_96_tiprack_50ul/1',
            loadName: 'opentrons_flex_96_tiprack_50ul',
            namespace: 'opentrons',
            version: 1,
            location: {
              labwareId:
                '32e97c67-866e-4153-bcb7-2b86b1d3f1fe:opentrons/corning_24_wellplate_3.4ml_flat/2',
            },
          },
        },
        {
          commandType: 'moveLabware',
          key: '1395243a-958f-4305-9687-52cdaf39f2b6',
          params: {
            labwareId:
              '733c04a8-ae8c-449f-a1f9-ca3783fdda58:opentrons/biorad_96_wellplate_200ul_pcr/2',
            strategy: 'usingGripper',
            newLocation: { slotName: 'C1' },
          },
        },
        {
          commandType: 'moveLabware',
          key: '4e39e7ec-4ada-4e3c-8369-1ff7421061a9',
          params: {
            labwareId:
              '32e97c67-866e-4153-bcb7-2b86b1d3f1fe:opentrons/corning_24_wellplate_3.4ml_flat/2',
            strategy: 'usingGripper',
            newLocation: { addressableAreaName: 'A4' },
          },
        },
      ] as CreateCommand[],
    }
    const mockStagingAreaSlotNames: AddressableAreaName[] = ['A4', 'B4']
    const mockHasWasteChuteCommands = false

    expect(
      getUnoccupiedSlotForTrash(
        mockPDFile,
        mockHasWasteChuteCommands,
        mockStagingAreaSlotNames
      )
    ).toStrictEqual('C3')
  })
  it('returns cutoutD3 for waste chute when every slot is occupied except for D3 on a staging area', () => {
    const mockPDFile: any = {
      commands: [
        {
          key: '159e778d-0fc5-4d24-a662-b1e59a7babda',
          commandType: 'loadModule',
          params: {
            model: 'thermocyclerModuleV2',
            location: { slotName: 'B1' },
            moduleId:
              '8932e104-7d57-42cf-88e4-ade334c84a76:thermocyclerModuleType',
          },
        },
        {
          key: '7d1fdcce-fa27-4520-8f97-a901751a4396',
          commandType: 'loadModule',
          params: {
            model: 'temperatureModuleV2',
            location: { slotName: 'C1' },
            moduleId:
              '2944a6a5-45f7-4d96-a4a2-d2853206a9f0:temperatureModuleType',
          },
        },
        {
          key: '1c223945-bfa3-4174-9923-5ed84afd1820',
          commandType: 'loadModule',
          params: {
            model: 'heaterShakerModuleV1',
            location: { slotName: 'D1' },
            moduleId:
              '528620a6-6eb9-4000-bce3-a58809e16d4c:heaterShakerModuleType',
          },
        },
        {
          key: 'e06d0fd5-2ca8-4d0a-bcfd-4121849604da',
          commandType: 'loadModule',
          params: {
            model: 'magneticBlockV1',
            location: { slotName: 'D2' },
            moduleId: 'c8f8c89f-06df-468c-895d-33006db69beb:magneticBlockType',
          },
        },
        {
          key: 'f49ebdff-9780-4ca0-994c-2d2dd7c04b1d',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons 96 Well Aluminum Block',
            labwareId:
              'a69bcf2e-9461-4d43-be63-f3b8db66e5e7:opentrons/opentrons_96_well_aluminum_block/1',
            loadName: 'opentrons_96_well_aluminum_block',
            namespace: 'opentrons',
            version: 1,
            location: {
              moduleId:
                '2944a6a5-45f7-4d96-a4a2-d2853206a9f0:temperatureModuleType',
            },
          },
        },
        {
          key: 'dda244f9-ff80-4ede-a585-1a546a88ee77',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons 96 PCR Heater-Shaker Adapter',
            labwareId:
              '723a9551-ebba-4b4a-a92e-8d1fa0e813df:opentrons/opentrons_96_pcr_adapter/1',
            loadName: 'opentrons_96_pcr_adapter',
            namespace: 'opentrons',
            version: 1,
            location: {
              moduleId:
                '528620a6-6eb9-4000-bce3-a58809e16d4c:heaterShakerModuleType',
            },
          },
        },
        {
          key: '8c28ac95-c8d0-4481-8204-26b1babb54bf',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Tip Rack 50 µL',
            labwareId:
              'c80cffe7-d89d-430e-ba96-3c12f879e993:opentrons/opentrons_flex_96_tiprack_50ul/1',
            loadName: 'opentrons_flex_96_tiprack_50ul',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'C3' },
          },
        },
        {
          key: 'f0357fde-125a-464c-98ed-b1b9492daab8',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Filter Tip Rack 200 µL (1)',
            labwareId:
              '0a2d4b6f-a43d-428a-98f2-284809596776:opentrons/opentrons_flex_96_filtertiprack_200ul/1',
            loadName: 'opentrons_flex_96_filtertiprack_200ul',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'A3' },
          },
        },
        {
          key: 'e27ba758-8d28-486f-a443-6e2276842ad0',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Filter Tip Rack 200 µL (2)',
            labwareId:
              '417a6bb2-8831-4b4d-840b-7d9329606865:opentrons/opentrons_flex_96_filtertiprack_200ul/1',
            loadName: 'opentrons_flex_96_filtertiprack_200ul',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'B3' },
          },
        },
        {
          key: '37848c2a-4a1b-44f0-851a-d264368c47f8',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Filter Tip Rack 200 µL (3)',
            labwareId:
              'ebb13651-0a60-4f42-ab85-f7084aeb0c08:opentrons/opentrons_flex_96_filtertiprack_200ul/1',
            loadName: 'opentrons_flex_96_filtertiprack_200ul',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'A2' },
          },
        },
        {
          key: '768626df-b249-4d68-8f95-193b03113457',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Filter Tip Rack 200 µL (4)',
            labwareId:
              'b17e8c1b-a308-4eaa-a852-10ad300ddea8:opentrons/opentrons_flex_96_filtertiprack_200ul/1',
            loadName: 'opentrons_flex_96_filtertiprack_200ul',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'B2' },
          },
        },
        {
          key: 'b12a4e6e-7ffc-421f-a2b6-44ae49d6f7bf',
          commandType: 'loadLabware',
          params: {
            displayName: 'Reagent Plate',
            labwareId:
              'aab3280f-6e7b-4e60-8326-c1d38999e08f:opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
            loadName: 'opentrons_96_wellplate_200ul_pcr_full_skirt',
            namespace: 'opentrons',
            version: 2,
            location: {
              labwareId:
                'a69bcf2e-9461-4d43-be63-f3b8db66e5e7:opentrons/opentrons_96_well_aluminum_block/1',
            },
          },
        },
        {
          key: 'e6863a1e-8aa0-4484-9aff-74ea9195a815',
          commandType: 'loadLabware',
          params: {
            displayName: 'Sample Plate 1',
            labwareId:
              '8e755287-33cb-483f-b525-fff876893754:opentrons/opentrons_96_wellplate_200ul_pcr_full_skirt/2',
            loadName: 'opentrons_96_wellplate_200ul_pcr_full_skirt',
            namespace: 'opentrons',
            version: 2,
            location: {
              labwareId:
                '723a9551-ebba-4b4a-a92e-8d1fa0e813df:opentrons/opentrons_96_pcr_adapter/1',
            },
          },
        },
        {
          key: 'b29f48ef-3b20-457e-8499-df709818c47f',
          commandType: 'loadLabware',
          params: {
            displayName: 'NEST 96 Deep Well Plate 2mL',
            labwareId:
              'f0d30267-b0f6-493a-b0ea-70303428fa83:opentrons/nest_96_wellplate_2ml_deep/2',
            loadName: 'nest_96_wellplate_2ml_deep',
            namespace: 'opentrons',
            version: 2,
            location: {
              moduleId:
                'c8f8c89f-06df-468c-895d-33006db69beb:magneticBlockType',
            },
          },
        },
        {
          key: '50be2f72-c7bc-4fd4-b10c-2054b90f922d',
          commandType: 'loadLabware',
          params: {
            displayName: 'NEST 12 Well Reservoir 15 mL',
            labwareId:
              'b60bbc39-cd82-4ede-b744-e88777a32b62:opentrons/nest_12_reservoir_15ml/1',
            loadName: 'nest_12_reservoir_15ml',
            namespace: 'opentrons',
            version: 1,
            location: { slotName: 'C2' },
          },
        },
        {
          key: 'a2f0c011-9983-46d9-a3ae-763a04856651',
          commandType: 'loadLabware',
          params: {
            displayName: 'Opentrons Flex 96 Tip Rack 50 µL (1)',
            labwareId:
              '0d3d02a6-6501-4f28-81b9-12b2fe66998b:opentrons/opentrons_flex_96_tiprack_50ul/1',
            loadName: 'opentrons_flex_96_tiprack_50ul',
            namespace: 'opentrons',
            version: 1,
            location: { addressableAreaName: 'D4' },
          },
        },
      ],
    }
    const mockStagingAreaSlotNames: AddressableAreaName[] = ['D4']
    const mockHasWasteChuteCommands = false

    expect(
      getUnoccupiedSlotForTrash(
        mockPDFile,
        mockHasWasteChuteCommands,
        mockStagingAreaSlotNames
      )
    ).toStrictEqual(WASTE_CHUTE_CUTOUT)
  })
})
