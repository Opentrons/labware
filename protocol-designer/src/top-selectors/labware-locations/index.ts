import { createSelector } from 'reselect'
import mapValues from 'lodash/mapValues'
import {
  THERMOCYCLER_MODULE_TYPE,
  getDeckDefFromRobotType,
  getModuleDisplayName,
  FLEX_ROBOT_TYPE,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
  WASTE_CHUTE_CUTOUT,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  isAddressableAreaStandardSlot,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
  FLEX_MODULE_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import { COLUMN_4_SLOTS, getHasWasteChute } from '@opentrons/step-generation'
import {
  START_TERMINAL_ITEM_ID,
  END_TERMINAL_ITEM_ID,
  PRESAVED_STEP_ID,
} from '../../steplist'
import { selectors as stepFormSelectors } from '../../step-forms'
import { getActiveItem } from '../../ui/steps'
import { TERMINAL_ITEM_SELECTION_TYPE } from '../../ui/steps/reducers'
import { selectors as fileDataSelectors } from '../../file-data'
import { getRobotType } from '../../file-data/selectors'
import {
  getLabwareEntities,
  getModuleEntities,
  getPipetteEntities,
  getAdditionalEquipmentEntities,
} from '../../step-forms/selectors'
import { getIsAdapter } from '../../utils'
import type { CutoutId, AddressableAreaName } from '@opentrons/shared-data'
import type { RobotState } from '@opentrons/step-generation'
import type { AllTemporalPropertiesForTimelineFrame } from '../../step-forms'
import type { Selector } from '../../types'

interface Option {
  name: string
  value: string
}

export const getRobotStateAtActiveItem: Selector<RobotState | null> = createSelector(
  stepFormSelectors.getOrderedStepIds,
  fileDataSelectors.getRobotStateTimeline,
  getActiveItem,
  fileDataSelectors.getInitialRobotState,
  fileDataSelectors.lastValidRobotState,
  (
    orderedStepIds,
    robotStateTimeline,
    activeItem,
    initialRobotState,
    lastValidRobotState
  ) => {
    let robotState = null
    if (activeItem == null) return null

    if (activeItem.selectionType === TERMINAL_ITEM_SELECTION_TYPE) {
      const terminalId = activeItem.id

      if (terminalId === START_TERMINAL_ITEM_ID) {
        robotState = initialRobotState
      } else if (
        terminalId === END_TERMINAL_ITEM_ID ||
        terminalId === PRESAVED_STEP_ID
      ) {
        robotState = lastValidRobotState
      } else {
        console.error(
          `Invalid terminalId ${terminalId}, could not robotState of active item`
        )
      }
    } else {
      const stepId = activeItem.id
      const timeline = robotStateTimeline.timeline
      const timelineIdx = orderedStepIds.includes(stepId)
        ? orderedStepIds.findIndex(id => id === stepId)
        : null

      if (timelineIdx == null) {
        console.error(`Expected non-null timelineIdx for step ${stepId}`)
        return null
      }
      if (timelineIdx === 0) {
        robotState = initialRobotState
      } else {
        const prevFrame = timeline[timelineIdx - 1]
        if (prevFrame) robotState = prevFrame.robotState
      }
    }

    return robotState
  }
)

//  TODO(jr, 9/20/23): we should test this util since it does a lot.
export const getUnoccupiedLabwareLocationOptions: Selector<
  Option[] | null
> = createSelector(
  getRobotStateAtActiveItem,
  getModuleEntities,
  getRobotType,
  getLabwareEntities,
  getAdditionalEquipmentEntities,
  (
    robotState,
    moduleEntities,
    robotType,
    labwareEntities,
    additionalEquipmentEntities
  ) => {
    const deckDef = getDeckDefFromRobotType(robotType)
    const cutoutFixtures = deckDef.cutoutFixtures
    const hasWasteChute = getHasWasteChute(additionalEquipmentEntities)
    const allSlotIds = deckDef.locations.addressableAreas.reduce<
      AddressableAreaName[]
    >((acc, slot) => {
      return hasWasteChute && slot.id === 'D3' ? acc : [...acc, slot.id]
    }, [])
    const stagingAreaCutoutIds = Object.values(additionalEquipmentEntities)
      .filter(aE => aE.name === 'stagingArea')
      //  TODO(jr, 11/13/23): fix AdditionalEquipment['location'] from type string to CutoutId
      .map(aE => aE.location as CutoutId)

    if (robotState == null) return null

    const { modules, labware } = robotState
    const slotIdsOccupiedByModules = Object.entries(modules).reduce<string[]>(
      (acc, [modId, modOnDeck]) => {
        if (moduleEntities[modId]?.type === THERMOCYCLER_MODULE_TYPE) {
          return robotType === 'OT-2 Standard'
            ? [...acc, '7', '8', '10', '11']
            : [...acc, 'A1', 'B1']
        } else {
          return [...acc, modOnDeck.slot]
        }
      },
      []
    )

    const unoccupiedAdapterOptions = Object.entries(labware).reduce<Option[]>(
      (acc, [labwareId, labwareOnDeck]) => {
        const labwareOnAdapter = Object.values(labware).find(
          temporalProperties => temporalProperties.slot === labwareId
        )
        const adapterSlot = labwareOnDeck.slot
        const modIdWithAdapter = Object.keys(modules).find(
          modId => modId === labwareOnDeck.slot
        )
        const adapterDisplayName =
          labwareEntities[labwareId].def.metadata.displayName
        const modSlot =
          modIdWithAdapter != null ? modules[modIdWithAdapter].slot : null
        const isAdapter = getIsAdapter(labwareId, labwareEntities)
        const moduleUnderAdapter =
          modIdWithAdapter != null
            ? getModuleDisplayName(moduleEntities[modIdWithAdapter].model)
            : 'unknown module'
        const moduleSlotInfo = modSlot ?? 'unknown slot'
        const adapterSlotInfo = adapterSlot ?? 'unknown adapter'

        return labwareOnAdapter == null && isAdapter
          ? [
              ...acc,
              {
                name:
                  modIdWithAdapter != null
                    ? `${moduleSlotInfo} on ${moduleUnderAdapter} with ${adapterDisplayName}`
                    : `${adapterSlotInfo} with ${adapterDisplayName}`,
                value: labwareId,
              },
            ]
          : acc
      },
      []
    )

    const unoccupiedModuleOptions = Object.entries(modules).reduce<Option[]>(
      (acc, [modId, modOnDeck]) => {
        const moduleHasLabware = Object.entries(labware).some(
          ([lwId, lwOnDeck]) => lwOnDeck.slot === modId
        )
        return moduleHasLabware
          ? acc
          : [
              ...acc,
              {
                name: `${modOnDeck.slot} on ${getModuleDisplayName(
                  moduleEntities[modId].model
                )}`,
                value: modId,
              },
            ]
      },
      []
    )

    const stagingAreaAddressableAreaNames = stagingAreaCutoutIds
      .flatMap(cutoutId => {
        const addressableAreasOnCutout = cutoutFixtures.find(
          cutoutFixture => cutoutFixture.id === STAGING_AREA_RIGHT_SLOT_FIXTURE
        )?.providesAddressableAreas[cutoutId]
        return addressableAreasOnCutout ?? []
      })
      .filter(aa => !isAddressableAreaStandardSlot(aa, deckDef))

    //  TODO(jr, 11/13/23): update COLUMN_4_SLOTS usage to FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS
    const notSelectedStagingAreaAddressableAreas = COLUMN_4_SLOTS.filter(slot =>
      stagingAreaAddressableAreaNames.every(
        addressableArea => addressableArea !== slot
      )
    )

    const unoccupiedSlotOptions = allSlotIds
      .filter(slotId => {
        const isTrashSlot =
          robotType === FLEX_ROBOT_TYPE
            ? MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(slotId)
            : ['fixedTrash', '12'].includes(slotId)
        return (
          !slotIdsOccupiedByModules.includes(slotId) &&
          !Object.values(labware)
            .map(lw => lw.slot)
            .includes(slotId) &&
          !isTrashSlot &&
          !WASTE_CHUTE_ADDRESSABLE_AREAS.includes(slotId) &&
          !notSelectedStagingAreaAddressableAreas.includes(slotId) &&
          !FLEX_MODULE_ADDRESSABLE_AREAS.includes(slotId)
        )
      })
      .map(slotId => ({ name: slotId, value: slotId }))
    const offDeck = { name: 'Off-deck', value: 'offDeck' }
    const wasteChuteSlot = {
      name: 'Waste Chute in D3',
      value: WASTE_CHUTE_CUTOUT,
    }

    return hasWasteChute
      ? [
          wasteChuteSlot,
          ...unoccupiedAdapterOptions,
          ...unoccupiedModuleOptions,
          ...unoccupiedSlotOptions,
          offDeck,
        ]
      : [
          ...unoccupiedAdapterOptions,
          ...unoccupiedModuleOptions,
          ...unoccupiedSlotOptions,
          offDeck,
        ]
  }
)

export const getDeckSetupForActiveItem: Selector<AllTemporalPropertiesForTimelineFrame> = createSelector(
  getRobotStateAtActiveItem,
  getPipetteEntities,
  getModuleEntities,
  getLabwareEntities,
  getAdditionalEquipmentEntities,
  (
    robotState,
    pipetteEntities,
    moduleEntities,
    labwareEntities,
    additionalEquipmentEntities
  ) => {
    if (robotState == null)
      return {
        pipettes: {},
        labware: {},
        modules: {},
        additionalEquipmentOnDeck: {},
      }

    const filteredAdditionalEquipment = Object.fromEntries(
      Object.entries(additionalEquipmentEntities).filter(
        ([_, entity]) =>
          entity.name === 'wasteChute' ||
          entity.name === 'stagingArea' ||
          entity.name === 'trashBin'
      )
    )
    return {
      pipettes: mapValues(pipetteEntities, (pipEntity, pipId) => ({
        ...pipEntity,
        ...robotState.pipettes[pipId],
      })),
      labware: mapValues(labwareEntities, (lwEntity, lwId) => ({
        ...lwEntity,
        ...robotState.labware[lwId],
      })),
      modules: mapValues(moduleEntities, (modEntity, modId) => ({
        ...modEntity,
        ...robotState.modules[modId],
      })),
      additionalEquipmentOnDeck: mapValues(
        filteredAdditionalEquipment,
        additionalEquipmentEntity => ({
          ...additionalEquipmentEntity,
        })
      ),
    }
  }
)
