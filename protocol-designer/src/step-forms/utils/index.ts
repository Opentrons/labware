import reduce from 'lodash/reduce'
import values from 'lodash/values'
import find from 'lodash/find'
import mapValues from 'lodash/mapValues'
import {
  getPipetteSpecsV2,
  GEN_ONE_MULTI_PIPETTES,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
  WASTE_CHUTE_CUTOUT,
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'
import { SPAN7_8_10_11_SLOT, TC_SPAN_SLOTS } from '../../constants'
import { hydrateField } from '../../steplist/fieldLevel'
import { getCutoutIdByAddressableArea } from '../../utils'
import type { LabwareDefByDefURI } from '../../labware-defs'
import type {
  AddressableAreaName,
  CutoutId,
  DeckSlotId,
  LoadLabwareCreateCommand,
  LoadModuleCreateCommand,
  ModuleType,
  MoveLabwareCreateCommand,
  RobotType,
} from '@opentrons/shared-data'
import type {
  NormalizedPipette,
  NormalizedPipetteById,
  PipetteEntity,
  PipetteEntities,
  InvariantContext,
  ModuleEntity,
} from '@opentrons/step-generation'
import type { DeckSlot } from '../../types'
import type { FormData } from '../../form-types'
import type { PDProtocolFile } from '../../file-types'
import type {
  AdditionalEquipmentOnDeck,
  InitialDeckSetup,
  ModuleOnDeck,
  FormPipettesByMount,
  FormPipette,
  LabwareOnDeck as LabwareOnDeckType,
} from '../types'
export { createPresavedStepForm } from './createPresavedStepForm'

const MOVABLE_TRASH_CUTOUTS = [
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

const slotToCutoutOt2Map: { [key: string]: string } = {
  '1': 'cutout1',
  '2': 'cutout2',
  '3': 'cutout3',
  '4': 'cutout4',
  '5': 'cutout5',
  '6': 'cutout6',
  '7': 'cutout7',
  '8': 'cutout8',
  '9': 'cutout9',
  '10': 'cutout10',
  '11': 'cutout11',
  '12': 'cutout12',
}

export function getIdsInRange<T extends string | number>(
  orderedIds: T[],
  startId: T,
  endId: T
): T[] {
  const startIdx = orderedIds.findIndex(id => id === startId)
  const endIdx = orderedIds.findIndex(id => id === endId)
  console.assert(
    startIdx !== -1,
    `start step "${String(startId)}" does not exist in orderedStepIds`
  )
  console.assert(
    endIdx !== -1,
    `end step "${String(endId)}" does not exist in orderedStepIds`
  )
  console.assert(
    endIdx >= startIdx,
    `expected end index to be greater than or equal to start index, got "${startIdx}", "${endIdx}"`
  )
  return orderedIds.slice(startIdx, endIdx + 1)
}
// NOTE: deck items include labware and modules
export function getDeckItemIdInSlot(
  itemIdToSlot: Record<string, DeckSlotId>,
  slot: DeckSlotId
): string | null | undefined {
  const idsForSourceSlot = Object.entries(itemIdToSlot)
    .filter(([id, labwareSlot]) => labwareSlot === slot)
    .map(([id, labwareSlot]) => id)
  console.assert(
    idsForSourceSlot.length < 2,
    `multiple deck items in slot ${slot}, expected none or one`
  )
  return idsForSourceSlot[0]
}
export function denormalizePipetteEntities(
  pipetteInvariantProperties: NormalizedPipetteById,
  labwareDefs: LabwareDefByDefURI
): PipetteEntities {
  return reduce(
    pipetteInvariantProperties,
    (acc: PipetteEntities, pipette: NormalizedPipette): PipetteEntities => {
      const pipetteId = pipette.id
      const spec = getPipetteSpecsV2(pipette.name)

      if (!spec) {
        throw new Error(
          `no pipette spec for pipette id "${pipetteId}", name "${pipette.name}"`
        )
      }
      const pipetteEntity: PipetteEntity = {
        ...pipette,
        spec,
        tiprackLabwareDef: pipette.tiprackDefURI.map(def => labwareDefs[def]),
      }
      return { ...acc, [pipetteId]: pipetteEntity }
    },
    {}
  )
}
/** deprecated */
export const getSlotIdsBlockedBySpanning = (
  initialDeckSetup: InitialDeckSetup
): DeckSlot[] => {
  const loadedThermocycler = values(initialDeckSetup.modules).find(
    ({ type }: ModuleOnDeck) => type === THERMOCYCLER_MODULE_TYPE
  )
  if (loadedThermocycler != null) {
    return loadedThermocycler.slot === SPAN7_8_10_11_SLOT
      ? ['7', '8', '10', '11']
      : ['A1', 'B1']
  }

  return []
}
export const getSlotIdsBlockedBySpanningForThermocycler = (
  initialDeckSetup: InitialDeckSetup,
  robotType: RobotType
): DeckSlot[] => {
  const loadedThermocycler = values(initialDeckSetup.modules).find(
    ({ type }: ModuleOnDeck) => type === THERMOCYCLER_MODULE_TYPE
  )
  if (loadedThermocycler != null && robotType === FLEX_ROBOT_TYPE) {
    return ['A1', 'B1']
  } else if (loadedThermocycler != null && robotType === OT2_ROBOT_TYPE) {
    return ['7', '8', '10', '11']
  }

  return []
}

//  TODO(jr, 3/13/24): refactor this util it is messy and confusing
export const getSlotIsEmpty = (
  initialDeckSetup: InitialDeckSetup,
  slot: string,
  /* we don't always want to count the slot as full if there is a staging area present
     since labware/wasteChute can still go on top of staging areas  **/
  includeStagingAreas?: boolean
): boolean => {
  //   special-casing the TC's slot A1 for the Flex
  if (
    slot === 'cutoutA1' &&
    Object.values(initialDeckSetup.modules).find(
      module => module.type === THERMOCYCLER_MODULE_TYPE
    )
  ) {
    return false
  } else if (
    slot === SPAN7_8_10_11_SLOT &&
    TC_SPAN_SLOTS.some(slot => !getSlotIsEmpty(initialDeckSetup, slot))
  ) {
    // special "spanning slot" is not empty if there's anything in the slots that it spans,
    // even when there's no spanning labware/module (eg thermocycler) on the deck
    return false
  } else if (getSlotIdsBlockedBySpanning(initialDeckSetup).includes(slot)) {
    // if a slot is being blocked by a spanning labware/module (eg thermocycler), it's not empty
    return false
    //  don't allow duplicating into the trash slot.
  } else if (slot === '12') {
    return false
  }

  const filteredAdditionalEquipmentOnDeck = values(
    initialDeckSetup.additionalEquipmentOnDeck
  ).filter((additionalEquipment: AdditionalEquipmentOnDeck) => {
    const cutoutForSlotOt2 = slotToCutoutOt2Map[slot]
    const includeStaging = includeStagingAreas
      ? true
      : additionalEquipment.name !== 'stagingArea'
    if (cutoutForSlotOt2 != null) {
      //  for Ot-2
      return additionalEquipment.location === cutoutForSlotOt2 && includeStaging
    } else {
      //  for Flex
      return additionalEquipment.location?.includes(slot) && includeStaging
    }
  })
  return (
    [
      ...values(initialDeckSetup.modules).filter(
        (moduleOnDeck: ModuleOnDeck) => {
          const cutoutForSlotOt2 = slotToCutoutOt2Map[slot]
          return cutoutForSlotOt2 != null
            ? moduleOnDeck.slot === slot
            : slot.includes(moduleOnDeck.slot)
        }
      ),
      ...values(initialDeckSetup.labware).filter(
        (labware: LabwareOnDeckType) => labware.slot === slot
      ),
      ...filteredAdditionalEquipmentOnDeck,
    ].length === 0
  )
}
export const getLabwareOnSlot = (
  initialDeckSetup: InitialDeckSetup,
  slot: string
): LabwareOnDeckType | null => {
  return (
    find(initialDeckSetup.labware, labware => labware.slot === slot) ?? null
  )
}
export const getIsCrashablePipetteSelected = (
  pipettesByMount: FormPipettesByMount
): boolean => {
  const { left, right } = pipettesByMount
  return [left, right].some(
    (formPipette: FormPipette | null | undefined) =>
      // @ts-expect-error(sa, 2021-6-10): argument in .includes must be a string, since GEN_ONE_MULTI_PIPETTES is a list of strings
      formPipette && GEN_ONE_MULTI_PIPETTES.includes(formPipette?.pipetteName)
  )
}
export const getHasGen1MultiChannelPipette = (
  pipettes: InitialDeckSetup['pipettes']
): boolean => {
  const pipetteIds = Object.keys(pipettes)
  return pipetteIds.some(pipetteId =>
    GEN_ONE_MULTI_PIPETTES.includes(pipettes[pipetteId]?.name)
  )
}
export const getIsModuleOnDeck = (
  modules: InitialDeckSetup['modules'],
  moduleType: ModuleType
): boolean => {
  const moduleIds = Object.keys(modules)
  return moduleIds.some(moduleId => modules[moduleId]?.type === moduleType)
}

const getModuleEntity = (state: InvariantContext, id: string): ModuleEntity => {
  return state.moduleEntities[id]
}

// TODO: Ian 2019-01-25 type with hydrated form type, see #3161
export function getHydratedForm(
  rawForm: FormData,
  invariantContext: InvariantContext
): FormData {
  const hydratedForm = mapValues(rawForm, (value, name) =>
    hydrateField(invariantContext, name, value as string)
  )
  // TODO(IL, 2020-03-23): separate hydrated/denormalized fields from the other fields.
  // It's confusing that pipette is an ID string before this,
  // but a PipetteEntity object after this.
  // For `moduleId` field, it would be surprising to be a ModuleEntity!
  // Consider nesting all additional fields under 'meta' key,
  // following what we're doing with 'module'.
  // See #3161
  hydratedForm.meta = {}

  if (rawForm?.moduleId != null) {
    // @ts-expect-error(sa, 2021-6-14): type this properly in #3161
    hydratedForm.meta.module = getModuleEntity(
      invariantContext,
      rawForm.moduleId as string
    )
  }
  // @ts-expect-error(sa, 2021-6-14):type this properly in #3161
  return hydratedForm
}

export const getUnoccupiedSlotForTrash = (
  file: PDProtocolFile,
  hasWasteChuteCommands: boolean,
  stagingAreaSlotNames: AddressableAreaName[]
): string => {
  const wasteChuteSlot = hasWasteChuteCommands ? [WASTE_CHUTE_CUTOUT] : []
  const stagingAreaCutoutIds = stagingAreaSlotNames.map(slotName =>
    getCutoutIdByAddressableArea(
      slotName,
      'stagingAreaRightSlot',
      FLEX_ROBOT_TYPE
    )
  )
  const allLoadLabwareSlotNames = Object.values(file.commands)
    .filter(
      (command): command is LoadLabwareCreateCommand =>
        command.commandType === 'loadLabware'
    )
    .reduce((acc: string[], command) => {
      const location = command.params.location
      if (
        location !== 'offDeck' &&
        location !== null &&
        'slotName' in location
      ) {
        return [...acc, location.slotName]
      }
      return acc
    }, [])

  const allLoadModuleSlotNames = Object.values(file.commands)
    .filter(
      (command): command is LoadModuleCreateCommand =>
        command.commandType === 'loadModule'
    )
    .flatMap(command => {
      //  special-casing Thermocycler
      if (command.params.model === THERMOCYCLER_MODULE_V2) {
        return ['A1', command.params.location.slotName]
      } else {
        return command.params.location.slotName
      }
    })

  const allMoveLabwareLocations = Object.values(file.commands)
    .filter(
      (command): command is MoveLabwareCreateCommand =>
        command.commandType === 'moveLabware'
    )
    .reduce((acc: string[], command) => {
      const newLocation = command.params.newLocation
      if (
        newLocation !== 'offDeck' &&
        newLocation !== null &&
        'slotName' in newLocation
      ) {
        return [...acc, newLocation.slotName]
      }
      return acc
    }, [])

  const unoccupiedSlot = MOVABLE_TRASH_CUTOUTS.find(
    cutout =>
      !allLoadLabwareSlotNames.includes(cutout.slot) &&
      !allLoadModuleSlotNames.includes(cutout.slot) &&
      !allMoveLabwareLocations.includes(cutout.slot) &&
      !wasteChuteSlot.includes(cutout.value as typeof WASTE_CHUTE_CUTOUT) &&
      !stagingAreaCutoutIds.includes(cutout.value as CutoutId)
  )
  //  if all slots are occupied except for D3 on a staging area, then auto-generate the waste chute
  if (
    unoccupiedSlot == null &&
    !allLoadLabwareSlotNames.includes('D3') &&
    stagingAreaCutoutIds.includes(WASTE_CHUTE_CUTOUT)
  ) {
    return WASTE_CHUTE_CUTOUT
  }

  if (unoccupiedSlot == null) {
    console.error(
      'Expected to find an unoccupied slot for auto-generating a trash bin but could not'
    )
    return ''
  }

  return unoccupiedSlot.slot
}
