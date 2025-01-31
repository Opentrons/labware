import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useIsOEMMode } from '/app/resources/robot-settings/hooks'

import {
  useGripperDisplayName,
  usePipetteModelSpecs,
  usePipetteNameSpecs,
  usePipetteSpecsV2,
} from '../hooks'

import type { PipetteV2Specs } from '@opentrons/shared-data'

vi.mock('/app/resources/robot-settings/hooks')

const BRANDED_P1000_FLEX_DISPLAY_NAME = 'Flex 1-Channel 1000 μL'
const ANONYMOUS_P1000_FLEX_DISPLAY_NAME = '1-Channel 1000 μL'

const mockP1000V2Specs = {
  $otSharedSchema: '#/pipette/schemas/2/pipetteGeometrySchema.json',
  availableSensors: {
    sensors: ['pressure', 'capacitive', 'environment'],
    capacitive: { count: 1 },
    environment: { count: 1 },
    pressure: { count: 1 },
  },
  backCompatNames: [],
  backlashDistance: 0.1,
  channels: 1,
  displayCategory: 'FLEX',
  displayName: BRANDED_P1000_FLEX_DISPLAY_NAME,
  dropTipConfigurations: { plungerEject: { current: 1, speed: 15 } },
  liquids: {
    default: {
      $otSharedSchema: '#/pipette/schemas/2/pipetteLiquidPropertiesSchema.json',
      defaultTipracks: [
        'opentrons/opentrons_flex_96_tiprack_1000ul/1',
        'opentrons/opentrons_flex_96_tiprack_200ul/1',
        'opentrons/opentrons_flex_96_tiprack_50ul/1',
        'opentrons/opentrons_flex_96_tiprack_20ul/1',
        'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
        'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
        'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
        'opentrons/opentrons_flex_96_filtertiprack_20ul/1',
      ],
      minVolume: 5,
      maxVolume: 1000,
      supportedTips: expect.anything(),
    },
  },
  model: 'p1000',
  nozzleMap: expect.anything(),
  pathTo3D:
    'pipette/definitions/2/geometry/single_channel/p1000/placeholder.gltf',
  validNozzleMaps: {
    maps: {
      SingleA1: ['A1'],
    },
  },
  pickUpTipConfigurations: {
    pressFit: {
      presses: 1,
      increment: 0,
      configurationsByNozzleMap: {
        SingleA1: {
          default: {
            speed: 10,
            distance: 13,
            current: 0.2,
            tipOverlaps: {
              v0: {
                default: 10.5,
                'opentrons/opentrons_flex_96_tiprack_1000ul/1': 9.65,
                'opentrons/opentrons_flex_96_tiprack_200ul/1': 9.76,
                'opentrons/opentrons_flex_96_tiprack_50ul/1': 10.09,
                'opentrons/opentrons_flex_96_filtertiprack_1000ul/1': 9.65,
                'opentrons/opentrons_flex_96_filtertiprack_200ul/1': 9.76,
                'opentrons/opentrons_flex_96_filtertiprack_50ul/1': 10.09,
              },
            },
          },
        },
      },
    },
  },
  partialTipConfigurations: {
    availableConfigurations: null,
    partialTipSupported: false,
  },
  plungerHomingConfigurations: { current: 1, speed: 30 },
  plungerMotorConfigurations: { idle: 0.3, run: 1 },
  plungerPositionsConfigurations: {
    default: { blowout: 76.5, bottom: 71.5, drop: 90.5, top: 0 },
  },
  quirks: [],
  shaftDiameter: 4.5,
  shaftULperMM: 15.904,
  nozzleOffset: [-8, -22, -259.15],
  orderedColumns: expect.anything(),
  orderedRows: expect.anything(),
  pipetteBoundingBoxOffsets: {
    backLeftCorner: [-8, -22, -259.15],
    frontRightCorner: [-8, -22, -259.15],
  },
  lldSettings: {
    t50: {
      minHeight: 1.0,
      minVolume: 0,
    },
    t200: {
      minHeight: 1.0,
      minVolume: 0,
    },
    t1000: {
      minHeight: 1.5,
      minVolume: 0,
    },
  },
} as PipetteV2Specs

describe('pipette data accessor hooks', () => {
  beforeEach(() => {
    vi.mocked(useIsOEMMode).mockReturnValue(false)
  })

  describe('usePipetteNameSpecs', () => {
    it('returns the branded display name for P1000 single flex', () => {
      expect(usePipetteNameSpecs('p1000_single_flex')?.displayName).toEqual(
        BRANDED_P1000_FLEX_DISPLAY_NAME
      )
    })

    it('returns an anonymized display name in OEM mode', () => {
      vi.mocked(useIsOEMMode).mockReturnValue(true)
      expect(usePipetteNameSpecs('p1000_single_flex')?.displayName).toEqual(
        ANONYMOUS_P1000_FLEX_DISPLAY_NAME
      )
    })
  })

  describe('usePipetteModelSpecs', () => {
    it('returns the branded display name for P1000 single flex', () => {
      expect(usePipetteModelSpecs('p1000_single_v3.6')?.displayName).toEqual(
        BRANDED_P1000_FLEX_DISPLAY_NAME
      )
    })

    it('returns an anonymized display name in OEM mode', () => {
      vi.mocked(useIsOEMMode).mockReturnValue(true)
      expect(usePipetteModelSpecs('p1000_single_v3.6')?.displayName).toEqual(
        ANONYMOUS_P1000_FLEX_DISPLAY_NAME
      )
    })
  })

  describe('usePipetteSpecsV2', () => {
    it('returns the correct info for p1000_single_flex which should be the latest model version 3.7', () => {
      expect(usePipetteSpecsV2('p1000_single_flex')).toStrictEqual(
        mockP1000V2Specs
      )
    })
    it('returns an anonymized display name in OEM mode', () => {
      vi.mocked(useIsOEMMode).mockReturnValue(true)
      expect(usePipetteSpecsV2('p1000_single_flex')).toStrictEqual({
        ...mockP1000V2Specs,
        displayName: ANONYMOUS_P1000_FLEX_DISPLAY_NAME,
      })
    })
  })

  describe('useGripperDisplayName', () => {
    it('returns the branded gripper display name', () => {
      expect(useGripperDisplayName('gripperV1.3')).toEqual('Flex Gripper')
    })
    it('returns an anonymized display name in OEM mode', () => {
      vi.mocked(useIsOEMMode).mockReturnValue(true)
      expect(useGripperDisplayName('gripperV1.3')).toEqual('Gripper')
    })
  })
})
