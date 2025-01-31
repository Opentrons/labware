import { createSelector } from 'reselect'
import {
  THERMOCYCLER_MODULE_TYPE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import { getHasWasteChute } from '@opentrons/step-generation'
import { timelineFrameBeforeActiveItem } from '../top-selectors/timelineFrames'
import {
  getUnsavedForm,
  getOrderedStepIds,
  getAdditionalEquipmentEntities,
} from '../step-forms/selectors'
import isEmpty from 'lodash/isEmpty'
import type { BaseState, Selector } from '../types'
import type { HintKey } from '.'

const rootSelector = (state: BaseState): BaseState['tutorial'] => state.tutorial

export const getHint: Selector<HintKey | null | undefined> = createSelector(
  rootSelector,
  tutorial => {
    const dismissedKeys = Object.keys(tutorial.dismissedHints)
    const hints = tutorial.hints.filter(
      hintKey => !dismissedKeys.includes(hintKey)
    )
    // TODO: Ian 2018-10-08 ordering of multiple hints is TBD.
    // For now, show 1 non-dismissed hint at a time
    return hints[0]
  }
)
export const getDismissedHints: Selector<HintKey[]> = createSelector(
  rootSelector,
  tutorial => {
    const dismissedKeys = Object.keys(tutorial.dismissedHints) as HintKey[]
    return dismissedKeys
  }
)
export const getCanClearHintDismissals: Selector<boolean> = createSelector(
  rootSelector,
  tutorial => !isEmpty(tutorial.dismissedHints)
)
export const shouldShowCoolingHint: Selector<boolean> = createSelector(
  timelineFrameBeforeActiveItem, // TODO(IL, 2020-12-15): this shouldn't use activeItem bc that is tied to hover state
  getUnsavedForm,
  (prevTimelineFrame, unsavedForm) => {
    if (unsavedForm?.stepType !== 'thermocycler') {
      return false
    }

    // TODO(IL, 2020-12-15): this might not be needed if we stop using activeItem. There should always be a prev frame IRL
    if (prevTimelineFrame == null) {
      return false
    }

    const { moduleId } = unsavedForm
    const prevModuleState =
      prevTimelineFrame.robotState.modules[moduleId]?.moduleState

    if (prevModuleState && prevModuleState.type === THERMOCYCLER_MODULE_TYPE) {
      const prevLidTemp = prevModuleState.lidTargetTemp
      const nextLidTemp = unsavedForm.lidTargetTemp
      if (prevLidTemp === null || nextLidTemp === null) return false
      return nextLidTemp < prevLidTemp
    } else {
      console.error('expected thermocycler module')
    }

    return false
  }
)
export const shouldShowBatchEditHint: Selector<boolean> = createSelector(
  getOrderedStepIds,
  orderedStepIds => orderedStepIds.length >= 1
)
export const shouldShowWasteChuteHint: Selector<boolean> = createSelector(
  timelineFrameBeforeActiveItem,
  getUnsavedForm,
  getAdditionalEquipmentEntities,
  (prevTimelineFrame, unsavedForm, additionalEquipmentEntities) => {
    const hasWasteChute = getHasWasteChute(additionalEquipmentEntities)
    if (unsavedForm?.stepType !== 'moveLabware' || !hasWasteChute) {
      return false
    }
    if (prevTimelineFrame == null) {
      return false
    }
    const { newLocation } = unsavedForm
    if (newLocation === WASTE_CHUTE_CUTOUT) {
      return true
    }

    return false
  }
)
