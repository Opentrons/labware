import some from 'lodash/some'
import { useEffect, useState } from 'react'
import {
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  OT2_ROBOT_TYPE,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
  getAreSlotsAdjacent,
  getModuleType,
} from '@opentrons/shared-data'

import { getStagingAreaAddressableAreas } from '../../../utils'
import {
  FLEX_MODULE_MODELS,
  OT2_MODULE_MODELS,
  RECOMMENDED_LABWARE_BY_MODULE,
} from './constants'

import type { Dispatch, SetStateAction } from 'react'
import type {
  AddressableAreaName,
  CutoutFixture,
  CutoutId,
  DeckDefinition,
  DeckSlotId,
  LabwareDefinition2,
  ModuleModel,
  RobotType,
} from '@opentrons/shared-data'
import type { LabwareDefByDefURI } from '../../../labware-defs'
import type {
  AllTemporalPropertiesForTimelineFrame,
  InitialDeckSetup,
  LabwareOnDeck,
} from '../../../step-forms'
import type { Fixture } from './constants'

const OT2_TC_SLOTS = ['7', '8', '10', '11']
const FLEX_TC_SLOTS = ['A1', 'B1']

export type ModuleModelExtended = ModuleModel | 'stagingAreaAndMagneticBlock'

export function getCutoutIdForAddressableArea(
  addressableArea: AddressableAreaName,
  cutoutFixtures: CutoutFixture[]
): CutoutId | null {
  return cutoutFixtures.reduce<CutoutId | null>((acc, cutoutFixture) => {
    const [cutoutId] =
      Object.entries(
        cutoutFixture.providesAddressableAreas
      ).find(([_cutoutId, providedAAs]) =>
        providedAAs.includes(addressableArea)
      ) ?? []
    return (cutoutId as CutoutId) ?? acc
  }, null)
}

export function getModuleModelsBySlot(
  robotType: RobotType,
  slot: DeckSlotId
): ModuleModelExtended[] {
  const FLEX_MIDDLE_SLOTS = new Set(['B2', 'C2', 'A2', 'D2'])
  const OT2_MIDDLE_SLOTS = ['2', '5', '8', '11']

  const FLEX_RIGHT_SLOTS = new Set(['A3', 'B3', 'C3', 'D3'])

  let moduleModels: ModuleModelExtended[] = [
    ...FLEX_MODULE_MODELS,
    'stagingAreaAndMagneticBlock',
  ]

  switch (robotType) {
    case FLEX_ROBOT_TYPE: {
      moduleModels = FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS.includes(
        slot as AddressableAreaName
      )
        ? []
        : [
            ...FLEX_MODULE_MODELS,
            'stagingAreaAndMagneticBlock' as ModuleModelExtended,
          ].filter(model => {
            if (model === THERMOCYCLER_MODULE_V2) {
              return slot === 'B1'
            } else if (model === ABSORBANCE_READER_V1) {
              return FLEX_RIGHT_SLOTS.has(slot)
            } else if (
              model === TEMPERATURE_MODULE_V2 ||
              model === HEATERSHAKER_MODULE_V1
            ) {
              return !FLEX_MIDDLE_SLOTS.has(slot)
            } else if (
              model === ('stagingAreaAndMagneticBlock' as ModuleModelExtended)
            ) {
              return FLEX_RIGHT_SLOTS.has(slot)
            }
            return true
          })
      break
    }
    case OT2_ROBOT_TYPE: {
      if (OT2_MIDDLE_SLOTS.includes(slot)) {
        moduleModels = []
      } else if (slot === '7') {
        moduleModels = OT2_MODULE_MODELS
      } else if (slot === '9') {
        moduleModels = OT2_MODULE_MODELS.filter(
          model =>
            getModuleType(model) !== HEATERSHAKER_MODULE_TYPE &&
            getModuleType(model) !== THERMOCYCLER_MODULE_TYPE
        )
      } else {
        moduleModels = OT2_MODULE_MODELS.filter(
          model => getModuleType(model) !== THERMOCYCLER_MODULE_TYPE
        )
      }
      break
    }
  }
  return moduleModels
}

export const getLabwareIsRecommended = (
  def: LabwareDefinition2,
  moduleModel?: ModuleModel | null
): boolean => {
  //  special-casing the thermocycler module V2 recommended labware since the thermocyclerModuleTypes
  //  have different recommended labware
  if (moduleModel == null) {
    // permissive early exit if no module passed
    return true
  }
  const moduleType = getModuleType(moduleModel)
  return moduleModel === THERMOCYCLER_MODULE_V2
    ? def.parameters.loadName === 'opentrons_96_wellplate_200ul_pcr_full_skirt'
    : RECOMMENDED_LABWARE_BY_MODULE[moduleType].includes(
        def.parameters.loadName
      )
}

export const getLabwareCompatibleWithAdapter = (
  defs: LabwareDefByDefURI,
  adapterLoadName?: string
): string[] => {
  if (adapterLoadName == null) {
    return []
  }
  return Object.entries(defs)
    .filter(
      ([, { stackingOffsetWithLabware }]) =>
        stackingOffsetWithLabware?.[adapterLoadName] != null
    )
    .map(([labwareDefUri]) => labwareDefUri)
}

interface DeckErrorsProps {
  modules: InitialDeckSetup['modules']
  selectedSlot: string
  selectedModel: ModuleModel
  labware: InitialDeckSetup['labware']
  robotType: RobotType
}

export const getDeckErrors = (props: DeckErrorsProps): string | null => {
  const { selectedSlot, selectedModel, modules, labware, robotType } = props

  let error = null

  if (robotType === OT2_ROBOT_TYPE) {
    const isModuleAdjacentToHeaterShaker =
      // modules can't be adjacent to heater shakers
      getModuleType(selectedModel) !== HEATERSHAKER_MODULE_TYPE &&
      some(
        modules,
        hwModule =>
          hwModule.type === HEATERSHAKER_MODULE_TYPE &&
          getAreSlotsAdjacent(hwModule.slot, selectedSlot)
      )

    if (isModuleAdjacentToHeaterShaker) {
      error = 'heater_shaker_adjacent'
    } else if (getModuleType(selectedModel) === HEATERSHAKER_MODULE_TYPE) {
      const isHeaterShakerAdjacentToAnotherModule = some(
        modules,
        hwModule =>
          getAreSlotsAdjacent(hwModule.slot, selectedSlot) &&
          // if the module is a heater shaker, it can't be adjacent to another module
          hwModule.type !== HEATERSHAKER_MODULE_TYPE
      )
      if (isHeaterShakerAdjacentToAnotherModule) {
        error = 'heater_shaker_adjacent_to'
      }
    } else if (getModuleType(selectedModel) === THERMOCYCLER_MODULE_TYPE) {
      const isLabwareInTCSlots = Object.values(labware).some(lw =>
        OT2_TC_SLOTS.includes(lw.slot)
      )
      if (isLabwareInTCSlots) {
        error = 'tc_slots_occupied_ot2'
      }
    }
  } else {
    if (getModuleType(selectedModel) === THERMOCYCLER_MODULE_TYPE) {
      const isLabwareInTCSlots = Object.values(labware).some(lw =>
        FLEX_TC_SLOTS.includes(lw.slot)
      )
      if (isLabwareInTCSlots) {
        error = 'tc_slots_occupied_flex'
      }
    }
  }

  return error
}

interface ZoomInOnCoordinateProps {
  x: number
  y: number
  deckDef: DeckDefinition
}
export function zoomInOnCoordinate(props: ZoomInOnCoordinateProps): string {
  const { x, y, deckDef } = props
  const [width, height] = [deckDef.dimensions[0], deckDef.dimensions[1]]

  const zoomFactor = 0.55
  const newWidth = width * zoomFactor
  const newHeight = height * zoomFactor

  //  +125 and +50 to get the approximate center of the screen point
  const newMinX = x - newWidth / 2 + 20
  const newMinY = y - newHeight / 2 + 50

  return `${newMinX} ${newMinY} ${newWidth} ${newHeight + 70}`
}

export interface AnimateZoomProps {
  targetViewBox: string
  viewBox: string
  setViewBox: Dispatch<SetStateAction<string>>
}

type ViewBox = [number, number, number, number]

export function animateZoom(props: AnimateZoomProps): void {
  const { targetViewBox, viewBox, setViewBox } = props

  if (targetViewBox === viewBox) return

  const duration = 500
  const start = performance.now()
  const initialViewBoxValues = viewBox.split(' ').map(Number) as ViewBox
  const targetViewBoxValues = targetViewBox.split(' ').map(Number) as ViewBox

  const animate = (time: number): void => {
    const elapsed = time - start
    const progress = Math.min(elapsed / duration, 1)

    const interpolatedViewBox = initialViewBoxValues.map(
      (start, index) => start + progress * (targetViewBoxValues[index] - start)
    )

    setViewBox(interpolatedViewBox.join(' '))

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  requestAnimationFrame(animate)
}

export const getAdjacentLabware = (
  fixture: Fixture,
  cutout: CutoutId,
  labware: AllTemporalPropertiesForTimelineFrame['labware']
): LabwareOnDeck | null => {
  let adjacentLabware: LabwareOnDeck | null = null
  if (fixture === 'stagingArea' || fixture === 'wasteChuteAndStagingArea') {
    const stagingAreaAddressableAreaName = getStagingAreaAddressableAreas([
      cutout,
    ])

    adjacentLabware =
      Object.values(labware).find(
        lw => lw.slot === stagingAreaAddressableAreaName[0]
      ) ?? null
  }
  return adjacentLabware
}

export const getAdjacentSlots = (
  fixture: Fixture,
  cutout: CutoutId
): AddressableAreaName[] | null => {
  if (fixture === 'stagingArea' || fixture === 'wasteChuteAndStagingArea') {
    const stagingAreaAddressableAreaNames = getStagingAreaAddressableAreas(
      [cutout],
      false
    )
    return stagingAreaAddressableAreaNames
  }
  return null
}

type BreakPoint = 'small' | 'medium' | 'large'

export function useDeckSetupWindowBreakPoint(): BreakPoint {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const handleResize = (): void => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  let size: BreakPoint = 'large'
  if (windowSize.width <= 1024 && windowSize.width > 800) {
    size = 'medium'
  } else if (windowSize.width <= 800) {
    size = 'small'
  }

  return size
}
