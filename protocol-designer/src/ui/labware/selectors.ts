import { createSelector } from 'reselect'
import mapValues from 'lodash/mapValues'
import reduce from 'lodash/reduce'
import {
  TRASH_BIN_DISPLAY_NAME,
  WASTE_CHUTE_DISPLAY_NAME,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  getIsTiprack,
  getLabwareDisplayName,
} from '@opentrons/shared-data'
import * as stepFormSelectors from '../../step-forms/selectors'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { getLabwareLatestSlot } from './utils'

import type {
  LabwareEntity,
  AdditionalEquipmentEntity,
} from '@opentrons/step-generation'
import type { DropdownOption } from '@opentrons/components'
import type { RobotType } from '@opentrons/shared-data'
import type { Selector } from '../../types'
import type {
  AllTemporalPropertiesForTimelineFrame,
  SavedStepFormState,
} from '../../step-forms'

export const getLabwareNicknamesById: Selector<
  Record<string, string>
> = createSelector(
  stepFormSelectors.getLabwareEntities,
  labwareIngredSelectors.getLabwareNameInfo,
  (labwareEntities, displayLabware): Record<string, string> =>
    mapValues(
      labwareEntities,
      (labwareEntity: LabwareEntity, id: string): string =>
        displayLabware[id]?.nickname || getLabwareDisplayName(labwareEntity.def)
    )
)
export const _sortLabwareDropdownOptions = (
  options: DropdownOption[]
): DropdownOption[] =>
  options.sort((a, b) => {
    // special case for trash (always at the bottom of the list)
    if (a.name === TRASH_BIN_DISPLAY_NAME) return 1
    if (b.name === TRASH_BIN_DISPLAY_NAME) return -1
    // sort by name everything else by name
    return a.name.localeCompare(b.name)
  })

const getNickname = (
  nicknamesById: Record<string, string>,
  initialDeckSetup: AllTemporalPropertiesForTimelineFrame,
  labwareId: string,
  savedStepForms: SavedStepFormState,
  robotType: RobotType
): string => {
  const latestSlot = getLabwareLatestSlot(
    initialDeckSetup,
    savedStepForms ?? {},
    labwareId,
    robotType
  )

  let nickName: string = nicknamesById[labwareId]
  if (latestSlot != null && latestSlot !== 'offDeck') {
    nickName = `${nicknamesById[labwareId]} in ${latestSlot}`
  } else if (latestSlot != null && latestSlot === 'offDeck') {
    nickName = `${nicknamesById[labwareId]} off-deck`
  }
  return nickName
}

/** Returns options for labware dropdowns for moveLabware.
 * Ordered by display name / nickname, but with trash at the bottom.
 */
export const getMoveLabwareOptions: Selector<DropdownOption[]> = createSelector(
  stepFormSelectors.getLabwareEntities,
  getLabwareNicknamesById,
  stepFormSelectors.getInitialDeckSetup,
  stepFormSelectors.getSavedStepForms,
  stepFormSelectors.getAdditionalEquipmentEntities,
  stepFormSelectors.getUnsavedForm,
  (
    labwareEntities,
    nicknamesById,
    initialDeckSetup,
    savedStepForms,
    additionalEquipmentEntities,
    unsavedForm
  ) => {
    const savedFormKeys = Object.keys(savedStepForms)
    const previouslySavedFormDataIndex = unsavedForm
      ? savedFormKeys.indexOf(unsavedForm.id)
      : -1
    const filteredSavedStepFormIds =
      previouslySavedFormDataIndex !== -1
        ? savedFormKeys.slice(0, previouslySavedFormDataIndex)
        : savedFormKeys

    const wasteChuteLocation = Object.values(additionalEquipmentEntities).find(
      aE => aE.name === 'wasteChute'
    )?.location
    const trashBinLocation = Object.values(additionalEquipmentEntities).find(
      aE => aE.name === 'trashBin'
    )?.location
    const robotType =
      trashBinLocation === 'cutout12' ? OT2_ROBOT_TYPE : FLEX_ROBOT_TYPE

    const moveLabwareOptions = reduce(
      labwareEntities,
      (
        acc: DropdownOption[],
        labwareEntity: LabwareEntity,
        labwareId: string
      ): DropdownOption[] => {
        const isLabwareInWasteChute =
          filteredSavedStepFormIds.find(
            id =>
              savedStepForms[id].stepType === 'moveLabware' &&
              savedStepForms[id].labware === labwareId &&
              savedStepForms[id].newLocation === wasteChuteLocation
          ) != null

        const isAdapter =
          labwareEntity.def.allowedRoles?.includes('adapter') ?? false
        const nickName = getNickname(
          nicknamesById,
          initialDeckSetup,
          labwareId,
          savedStepForms,
          robotType
        )

        //  filter out moving trash, adapters, and labware in
        //  waste chute for moveLabware
        return isAdapter || isLabwareInWasteChute
          ? acc
          : [
              ...acc,
              {
                name: nickName,
                value: labwareId,
              },
            ]
      },
      []
    )
    return _sortLabwareDropdownOptions(moveLabwareOptions)
  }
)

/** Returns options for labware dropdowns for moveLiquids.
 * Ordered by display name / nickname, but with trash at the bottom.
 */
export const getLabwareOptions: Selector<DropdownOption[]> = createSelector(
  stepFormSelectors.getLabwareEntities,
  getLabwareNicknamesById,
  stepFormSelectors.getInitialDeckSetup,
  stepFormSelectors.getSavedStepForms,
  stepFormSelectors.getAdditionalEquipmentEntities,
  (
    labwareEntities,
    nicknamesById,
    initialDeckSetup,
    savedStepForms,
    additionalEquipmentEntities
  ) => {
    const wasteChuteLocation = Object.values(additionalEquipmentEntities).find(
      aE => aE.name === 'wasteChute'
    )?.location
    const trashBinLocation = Object.values(additionalEquipmentEntities).find(
      aE => aE.name === 'trashBin'
    )?.location
    const robotType =
      trashBinLocation === 'cutout12' ? OT2_ROBOT_TYPE : FLEX_ROBOT_TYPE

    const labwareOptions = reduce(
      labwareEntities,
      (
        acc: DropdownOption[],
        labwareEntity: LabwareEntity,
        labwareId: string
      ): DropdownOption[] => {
        const isLabwareInWasteChute = Object.values(savedStepForms).find(
          form =>
            form.stepType === 'moveLabware' &&
            form.labware === labwareId &&
            form.newLocation === wasteChuteLocation
        )

        const isAdapter =
          labwareEntity.def.allowedRoles?.includes('adapter') ?? false
        const nickName = getNickname(
          nicknamesById,
          initialDeckSetup,
          labwareId,
          savedStepForms,
          robotType
        )

        return getIsTiprack(labwareEntity.def) ||
          isAdapter ||
          isLabwareInWasteChute
          ? acc
          : [
              ...acc,
              {
                name: nickName,
                value: labwareId,
              },
            ]
      },
      []
    )
    return _sortLabwareDropdownOptions(labwareOptions)
  }
)

/** Returns waste chute option */
export const getWasteChuteOption: Selector<DropdownOption | null> = createSelector(
  stepFormSelectors.getAdditionalEquipmentEntities,
  additionalEquipmentEntities => {
    const wasteChuteEntity = Object.values(additionalEquipmentEntities).find(
      aE => aE.name === 'wasteChute'
    )
    const wasteChuteOption: DropdownOption | null =
      wasteChuteEntity != null
        ? {
            name: WASTE_CHUTE_DISPLAY_NAME,
            value: wasteChuteEntity.id,
          }
        : null

    return wasteChuteOption
  }
)

/** Returns options for disposal (e.g. trash) */
export const getDisposalOptions = createSelector(
  stepFormSelectors.getAdditionalEquipment,
  getWasteChuteOption,
  (additionalEquipment, wasteChuteOption) => {
    const trashBins = reduce(
      additionalEquipment,
      (
        acc: DropdownOption[],
        additionalEquipment: AdditionalEquipmentEntity
      ): DropdownOption[] =>
        additionalEquipment.name === 'trashBin'
          ? [
              ...acc,
              {
                name: TRASH_BIN_DISPLAY_NAME,
                value: additionalEquipment.id ?? '',
              },
            ]
          : acc,
      []
    )

    return wasteChuteOption != null
      ? ([...trashBins, wasteChuteOption] as DropdownOption[])
      : trashBins
  }
)

export const getTiprackOptions: Selector<DropdownOption[]> = createSelector(
  stepFormSelectors.getLabwareEntities,
  getLabwareNicknamesById,
  (labwareEntities, nicknamesById) => {
    const options = reduce(
      labwareEntities,
      (
        acc: DropdownOption[],
        labwareEntity: LabwareEntity,
        labwareId: string
      ): DropdownOption[] => {
        const labwareDefURI = labwareEntity.labwareDefURI
        const optionDefURI = acc.map(option => option.value)

        if (
          optionDefURI.includes(labwareDefURI) ||
          !getIsTiprack(labwareEntity.def)
        ) {
          return acc
        } else {
          return [
            ...acc,
            {
              name: nicknamesById[labwareId],
              value: labwareDefURI,
            },
          ]
        }
      },
      []
    )
    return options
  }
)

export const getAllTiprackOptions: Selector<DropdownOption[]> = createSelector(
  stepFormSelectors.getLabwareEntities,
  getLabwareNicknamesById,
  (labwareEntities, nicknamesById) => {
    const options = reduce(
      labwareEntities,
      (
        acc: DropdownOption[],
        labwareEntity: LabwareEntity,
        labwareId: string
      ): DropdownOption[] => {
        if (!getIsTiprack(labwareEntity.def)) {
          return acc
        } else {
          return [
            ...acc,
            {
              name: nicknamesById[labwareId],
              value: labwareEntity.id,
            },
          ]
        }
      },
      []
    )
    return options
  }
)
