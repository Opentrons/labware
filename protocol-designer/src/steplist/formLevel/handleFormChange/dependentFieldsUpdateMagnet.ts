import { FormData, StepFieldName } from '../../../form-types'
import { FormPatch } from '../../actions/types'
import { getDefaultsForStepType } from '../getDefaultsForStepType'
import { chainPatchUpdaters, fieldHasChanged } from './utils'
import pick from 'lodash/pick'

// TODO: Ian 2019-02-21 import this from a more central place - see #2926
const getDefaultFields = (...fields: StepFieldName[]): FormPatch =>
  pick(getDefaultsForStepType('magnet'), fields)

const updatePatchOnMagnetActionChange = (
  patch: FormPatch,
  rawForm: FormData
): FormPatch => {
  if (fieldHasChanged(rawForm, patch, 'magnetAction')) {
    return { ...patch, ...getDefaultFields('engageHeight') }
  }

  return patch
}

export function dependentFieldsUpdateMagnet(
  originalPatch: FormPatch,
  rawForm: FormData // raw = NOT hydrated
): FormPatch {
  // sequentially modify parts of the patch until it's fully updated
  return chainPatchUpdaters(originalPatch, [
    chainPatch => updatePatchOnMagnetActionChange(chainPatch, rawForm),
  ])
}
