import {
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  OT2_ROBOT_TYPE,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'
import type { ModuleModel, ModuleType, RobotType } from '@opentrons/shared-data'
import type { Gen, PipetteType, PipetteVolumes } from './types'

export const PIPETTE_GENS: Gen[] = ['GEN1', 'GEN2']

interface PipType {
  label: string
  value: PipetteType
}

export const PIPETTE_TYPES: Record<RobotType, PipType[]> = {
  [OT2_ROBOT_TYPE]: [
    {
      label: 'one_channel',
      value: 'single',
    },
    {
      label: 'eight_channel',
      value: 'multi',
    },
  ],
  [FLEX_ROBOT_TYPE]: [
    {
      label: 'one_channel',
      value: 'single',
    },
    {
      label: 'eight_channel',
      value: 'multi',
    },
    {
      label: 'ninety_six_channel',
      value: '96',
    },
  ],
}

export const PIPETTE_VOLUMES: PipetteVolumes = {
  [FLEX_ROBOT_TYPE]: [
    {
      single: [
        { label: '50', value: 'p50' },
        { label: '1000', value: 'p1000' },
      ],
      multi: [
        { label: '50', value: 'p50' },
        { label: '1000', value: 'p1000' },
      ],
      '96': [{ label: '1000', value: 'p1000' }],
    },
  ],
  [OT2_ROBOT_TYPE]: [
    {
      GEN1: [
        {
          single: [
            { label: '10', value: 'p10' },
            { label: '50', value: 'p50' },
            { label: '300', value: 'p300' },
            { label: '1000', value: 'p1000' },
          ],
          multi: [
            { label: '10', value: 'p10' },
            { label: '50', value: 'p50' },
            { label: '300', value: 'p300' },
          ],
          '96': [],
        },
      ],
      GEN2: [
        {
          single: [
            { label: '20', value: 'p20' },
            { label: '300', value: 'p300' },
            { label: '1000', value: 'p1000' },
          ],
          multi: [
            { label: '20', value: 'p20' },
            { label: '300', value: 'p300' },
          ],
          '96': [],
        },
      ],
    },
  ],
}

export const FLEX_SUPPORTED_MODULE_MODELS: ModuleModel[] = [
  THERMOCYCLER_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  TEMPERATURE_MODULE_V2,
  ABSORBANCE_READER_V1,
]

export const OT2_SUPPORTED_MODULE_MODELS: ModuleModel[] = [
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  TEMPERATURE_MODULE_V1,
]

export const DEFAULT_SLOT_MAP_FLEX: {
  [moduleModel in ModuleModel]?: string
} = {
  [THERMOCYCLER_MODULE_V2]: 'B1',
  [HEATERSHAKER_MODULE_V1]: 'D1',
  [MAGNETIC_BLOCK_V1]: 'D2',
  [TEMPERATURE_MODULE_V2]: 'C1',
  [ABSORBANCE_READER_V1]: 'B3',
}

export const DEFAULT_SLOT_MAP_OT2: { [moduleType in ModuleType]?: string } = {
  [THERMOCYCLER_MODULE_TYPE]: '7',
  [HEATERSHAKER_MODULE_TYPE]: '1',
  [MAGNETIC_MODULE_TYPE]: '1',
  [TEMPERATURE_MODULE_TYPE]: '3',
}
