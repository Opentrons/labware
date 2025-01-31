/* eslint-disable import/no-default-export */
import pick from 'lodash/pick'
import { chainPatchUpdaters, fieldHasChanged } from './utils'
import { getDefaultsForStepType } from '../getDefaultsForStepType'
import type { FormData, StepFieldName } from '../../../form-types'
import type { FormPatch } from '../../actions/types'

// TODO: Ian 2019-02-21 import this from a more central place - see #2926
const getDefaultFields = (...fields: StepFieldName[]): FormPatch =>
  pick(getDefaultsForStepType('pause'), fields)

const updatePatchOnPauseTemperatureChange = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  if (fieldHasChanged(rawForm, patch, 'pauseAction')) {
    return {
      ...patch,
      ...getDefaultFields(
        'pauseTemperature',
        'pauseHour',
        'pauseMinute',
        'pauseSecond',
        'pauseTime',
        'moduleId'
      ),
    }
  }

  return patch
}

export function dependentFieldsUpdatePause(
  originalPatch: FormPatch,
  rawForm: FormData // raw = NOT hydrated
): FormPatch {
  // sequentially modify parts of the patch until it's fully updated
  return chainPatchUpdaters(originalPatch, [
    chainPatch => updatePatchOnPauseTemperatureChange(chainPatch, rawForm),
  ])
}
