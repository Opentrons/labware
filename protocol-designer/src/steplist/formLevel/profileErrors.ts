import uniqBy from 'lodash/uniqBy'
import { THERMOCYCLER_PROFILE } from '../../constants'
import { PROFILE_STEP } from '../../form-types'

import type { ReactNode } from 'react'
import type { ProfileStepItem } from '../../form-types'

// TODO: real HydratedFormData type
type HydratedFormData = any
export interface ProfileFormError {
  title: string
  body?: ReactNode
  dependentProfileFields: string[]
}
type ProfileFormErrorKey = 'INVALID_PROFILE_DURATION'
const PROFILE_FORM_ERRORS: Record<ProfileFormErrorKey, ProfileFormError> = {
  INVALID_PROFILE_DURATION: {
    title: 'Invalid profile duration',
    dependentProfileFields: ['durationMinutes', 'durationSeconds'],
  },
}
// TC Profile multi-field error fns
export const profileStepValidDuration = (
  step: ProfileStepItem
): ProfileFormError | null => {
  const minutes = parseFloat(step.durationMinutes) || 0
  const seconds = parseFloat(step.durationSeconds) || 0
  const isValid = minutes > 0 || seconds > 0
  return isValid ? null : PROFILE_FORM_ERRORS.INVALID_PROFILE_DURATION
}
// =====
const PROFILE_STEP_ERROR_GETTERS = [profileStepValidDuration]
export const getProfileFormErrors = (
  hydratedForm: HydratedFormData
): ProfileFormError[] => {
  if (
    hydratedForm.stepType !== 'thermocycler' ||
    hydratedForm.thermocyclerFormType !== THERMOCYCLER_PROFILE
  ) {
    return []
  }

  const { orderedProfileItems, profileItemsById } = hydratedForm
  const errors: ProfileFormError[] = []

  const addStepErrors = (step: ProfileStepItem): void => {
    PROFILE_STEP_ERROR_GETTERS.forEach(errorGetter => {
      const nextErrors = errorGetter(step)

      if (nextErrors !== null) {
        errors.push(nextErrors)
      }
    })
  }

  orderedProfileItems.forEach((itemId: string) => {
    const item = profileItemsById[itemId]

    if (item.type === PROFILE_STEP) {
      addStepErrors(item as ProfileStepItem)
    } else {
      // Cycles themselves don't currently have any form-level errors,
      // so we just validate each cycle's steps
      item.steps.forEach(addStepErrors)
    }
  })
  // NOTE: since errors stacking doesn't seem to serve a purpose, remove repeats
  return uniqBy(errors, error => error.title)
}
