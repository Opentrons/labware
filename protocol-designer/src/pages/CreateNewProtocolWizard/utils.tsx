import {
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
  getLabwareDefURI,
  getLabwareDisplayName,
  getPipetteSpecsV2,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_BLOCK_V1,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_TYPE,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import wasteChuteImage from '../../assets/images/waste_chute.png'
import trashBinImage from '../../assets/images/flex_trash_bin.png'
import stagingAreaImage from '../../assets/images/staging_area.png'
import { STAGING_AREA_CUTOUTS_ORDERED } from '../../constants'

import type {
  CutoutId,
  LabwareDefByDefURI,
  LabwareDefinition2,
  ModuleModel,
  PipetteName,
} from '@opentrons/shared-data'
import type { DropdownOption } from '@opentrons/components'
import type { AdditionalEquipment, WizardFormState } from './types'

const NUM_SLOTS_OUTER = 8
const NUM_SLOTS_MIDDLE = 4
const NUM_SLOTS_COLUMN1 = 4
// Note (1/31/25): change the max from 12 to 11 because of a fixture(trash bin/waste chute)
const NUM_SLOTS_MAGNETIC_BLOCK = 11

export const getNumOptions = (length: number): DropdownOption[] => {
  return Array.from({ length }, (_, i) => ({
    name: `${i + 1}`,
    value: `${i + 1}`,
  }))
}

// Note (1/31/25): at this moment, users allow to set one about thermocycler and need to count 2
interface ModuleCounts {
  magneticBlockCount: number
  heaterShakerCount: number
  temperatureCount: number
  plateReaderCount: number
}

const countModules = (modules: WizardFormState['modules']): ModuleCounts => {
  const magneticBlockCount = Object.values(modules || {}).filter(
    module => module.type === MAGNETIC_BLOCK_TYPE
  ).length
  const heaterShakerCount = Object.values(modules || {}).filter(
    module => module.type === HEATERSHAKER_MODULE_TYPE
  ).length
  const temperatureCount = Object.values(modules || {}).filter(
    module => module.type === TEMPERATURE_MODULE_TYPE
  ).length
  const plateReaderCount = Object.values(modules || {}).filter(
    module => module.type === ABSORBANCE_READER_TYPE
  ).length
  return {
    magneticBlockCount,
    heaterShakerCount,
    temperatureCount,
    plateReaderCount,
  }
}

export const getNumSlotsAvailable = (
  modules: WizardFormState['modules'],
  additionalEquipment: WizardFormState['additionalEquipment'],
  type: ModuleModel | AdditionalEquipment
  // @ts-expect-error flex stacker not yet supported in PD
): number => {
  const additionalEquipmentLength = additionalEquipment.filter(
    ae => ae !== 'gripper'
  ).length

  const hasTC = Object.values(modules || {}).some(
    module => module.type === THERMOCYCLER_MODULE_TYPE
  )

  const numStagingAreas =
    additionalEquipment.filter(ae => ae === 'stagingArea')?.length || 0

  const hasWasteChute = additionalEquipment.some(ae => ae === 'wasteChute')

  const magneticBlocks = Object.values(modules || {}).filter(
    module => module.type === MAGNETIC_BLOCK_TYPE
  )
  const magneticBlockCount = magneticBlocks.length
  const moduleCount = modules != null ? Object.keys(modules).length : 0
  let filteredModuleLength = moduleCount
  if (magneticBlockCount <= NUM_SLOTS_MIDDLE) {
    // Subtract magnetic blocks directly if their count is ≤ 4
    filteredModuleLength -= magneticBlockCount
  } else {
    // Subtract the excess magnetic blocks beyond 4
    const extraMagneticBlocks = magneticBlockCount - NUM_SLOTS_MIDDLE
    filteredModuleLength -= extraMagneticBlocks
  }
  if (hasTC) {
    filteredModuleLength += 1
  }

  let filteredAdditionalEquipmentLength = additionalEquipmentLength
  if (numStagingAreas >= 1 && hasWasteChute && type !== 'stagingArea') {
    filteredAdditionalEquipmentLength -= 1
  }
  switch (type) {
    case 'gripper': {
      return 0
    }

    //  these modules don't support MoaM
    case ABSORBANCE_READER_V1:
    case THERMOCYCLER_MODULE_V1:
    case TEMPERATURE_MODULE_V1:
    case MAGNETIC_MODULE_V1:
    case MAGNETIC_MODULE_V2: {
      return 1
    }

    case THERMOCYCLER_MODULE_V2: {
      if (filteredModuleLength + filteredAdditionalEquipmentLength > 7) {
        return 0
      } else {
        return 2
      }
    }

    case 'trashBin':
    case HEATERSHAKER_MODULE_V1:
    case TEMPERATURE_MODULE_V2: {
      return (
        NUM_SLOTS_OUTER -
        (filteredModuleLength + filteredAdditionalEquipmentLength)
      )
    }

    case 'stagingArea': {
      const {
        magneticBlockCount,
        heaterShakerCount,
        temperatureCount,
        plateReaderCount,
      } = countModules(modules)

      // Note (kk: 1/31/25) magnetic modules are placed in the middle slots first
      // then it will be placed in the column 1 slots and column 3 slots
      // the way to distribute magnetic modules like D1 -> D3 -> C1 -> C3
      const adjustMagneticBlockCount =
        magneticBlockCount - NUM_SLOTS_MIDDLE > 0
          ? magneticBlockCount - NUM_SLOTS_MIDDLE
          : 0

      const thermocyclerModuleCount = hasTC ? 2 : 0

      const totalModules =
        adjustMagneticBlockCount +
        heaterShakerCount +
        temperatureCount +
        thermocyclerModuleCount

      // if the following is more than 0, pd will need to keep one slot in column 3 for trash bin/waste chute
      const requiredSlotInColumn3 = totalModules - NUM_SLOTS_COLUMN1 > 0 ? 1 : 0

      // there is two cases pd considers
      // 1. stating area can slots in column 3 because trash bin can be a slot in column 1
      // 2. not case 1 which is very limited
      return totalModules <= NUM_SLOTS_COLUMN1
        ? NUM_SLOTS_COLUMN1 - plateReaderCount - requiredSlotInColumn3
        : NUM_SLOTS_OUTER -
            totalModules -
            plateReaderCount -
            requiredSlotInColumn3
    }

    case 'wasteChute': {
      const adjustmentForStagingArea = numStagingAreas >= 1 ? 1 : 0
      return (
        NUM_SLOTS_OUTER -
        (filteredModuleLength +
          filteredAdditionalEquipmentLength -
          adjustmentForStagingArea)
      )
    }

    case MAGNETIC_BLOCK_V1: {
      const filteredAdditionalEquipmentForMagneticBlockLength = additionalEquipment.filter(
        ae => ae !== 'gripper' && ae !== 'stagingArea'
      )?.length
      return (
        NUM_SLOTS_MAGNETIC_BLOCK -
        (filteredModuleLength +
          filteredAdditionalEquipmentForMagneticBlockLength)
      )
    }
  }
}

interface EquipmentProps {
  additionalEquipment: AdditionalEquipment
}

const IMAGE_WIDTH = '60px'
const IMAGE_HEIGHT = '54px'

export function AdditionalEquipmentDiagram(props: EquipmentProps): JSX.Element {
  const { additionalEquipment } = props

  switch (additionalEquipment) {
    case 'wasteChute': {
      return (
        <img
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          src={wasteChuteImage}
          alt={additionalEquipment}
        />
      )
    }
    case 'trashBin': {
      return (
        <img
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          src={trashBinImage}
          alt={additionalEquipment}
        />
      )
    }
    default: {
      return (
        <img
          width={IMAGE_WIDTH}
          height={IMAGE_HEIGHT}
          src={stagingAreaImage}
          alt={additionalEquipment}
        />
      )
    }
  }
}

interface TiprackOptionsProps {
  allLabware: LabwareDefByDefURI
  allowAllTipracks: boolean
  selectedPipetteName?: string | null
}
//  returns a hashmap of LabwareDefUri : displayName
export function getTiprackOptions(
  props: TiprackOptionsProps
): Record<string, string> {
  const { allLabware, allowAllTipracks, selectedPipetteName } = props

  if (!allLabware) return {}

  const pipetteSpecs = selectedPipetteName
    ? getPipetteSpecsV2(selectedPipetteName as PipetteName)
    : null

  const defaultTipracks = pipetteSpecs?.liquids.default.defaultTipracks ?? []
  const displayCategory = pipetteSpecs?.displayCategory ?? ''
  const isFlexPipette =
    displayCategory === 'FLEX' || selectedPipetteName === 'p1000_96'

  const tiprackOptionsMap = Object.values(allLabware)
    .filter(def => def.metadata.displayCategory === 'tipRack')
    .filter(def => {
      if (allowAllTipracks) {
        return isFlexPipette
          ? def.metadata.displayName.includes('Flex') ||
              def.namespace === 'custom_beta'
          : !def.metadata.displayName.includes('Flex') ||
              def.namespace === 'custom_beta'
      }
      return (
        defaultTipracks.includes(getLabwareDefURI(def)) ||
        def.namespace === 'custom_beta'
      )
    })
    .reduce((acc: Record<string, string>, def: LabwareDefinition2) => {
      const displayName = getLabwareDisplayName(def)
      const name =
        def.parameters.loadName.includes('flex') && isFlexPipette
          ? displayName.split('Opentrons Flex')[1]
          : displayName
      acc[getLabwareDefURI(def)] = name
      return acc
    }, {})

  return tiprackOptionsMap
}

export const MOVABLE_TRASH_CUTOUTS = [
  {
    value: 'cutoutA3',
    slot: 'A3',
  },
  {
    value: 'cutoutA1',
    slot: 'A1',
  },
  {
    value: 'cutoutB1',
    slot: 'B1',
  },
  {
    value: 'cutoutB3',
    slot: 'B3',
  },
  {
    value: 'cutoutC1',
    slot: 'C1',
  },
  {
    value: 'cutoutC3',
    slot: 'C3',
  },
  {
    value: 'cutoutD1',
    slot: 'D1',
  },
  {
    value: 'cutoutD3',
    slot: 'D3',
  },
]

export const getTrashSlot = (values: WizardFormState): string => {
  const { additionalEquipment, modules } = values
  const moduleSlots =
    modules != null
      ? Object.values(modules).flatMap(module =>
          module.type === THERMOCYCLER_MODULE_TYPE
            ? [module.slot, 'A1']
            : module.slot
        )
      : []
  const stagingAreas = additionalEquipment.filter(equipment =>
    equipment.includes('stagingArea')
  )

  // when plate reader is present, cutoutB3 is not available for StagingArea
  const hasPlateReader =
    modules !== null
      ? Object.values(modules).some(
          module => module.model === ABSORBANCE_READER_V1
        )
      : false
  const cutouts = stagingAreas.map((_, index) =>
    hasPlateReader
      ? STAGING_AREA_CUTOUTS_ORDERED.filter(cutout => cutout !== 'cutoutB3')[
          index
        ]
      : STAGING_AREA_CUTOUTS_ORDERED[index]
  )

  const hasWasteChute = additionalEquipment.find(equipment =>
    equipment.includes('wasteChute')
  )
  const wasteChuteSlot = Boolean(hasWasteChute)
    ? [WASTE_CHUTE_CUTOUT as string]
    : []
  const unoccupiedSlot = MOVABLE_TRASH_CUTOUTS.find(
    cutout =>
      !cutouts.includes(cutout.value as CutoutId) &&
      !moduleSlots.includes(cutout.slot) &&
      !wasteChuteSlot.includes(cutout.value)
  )
  if (unoccupiedSlot == null) {
    console.error(
      'Expected to find an unoccupied slot for the trash bin but could not'
    )
    return ''
  }
  return unoccupiedSlot?.value
}
