import difference from 'lodash/difference'
import isEqual from 'lodash/isEqual'
import without from 'lodash/without'
import startCase from 'lodash/startCase'
import {
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '@opentrons/step-generation'
import { ALL, COLUMN } from '@opentrons/shared-data'
import { getFieldErrors } from '../../../../steplist/fieldLevel'
import {
  getDisabledFields,
  getDefaultsForStepType,
} from '../../../../steplist/formLevel'
import { i18n } from '../../../../assets/localization'
import { PROFILE_CYCLE } from '../../../../form-types'
import type { PipetteEntity } from '@opentrons/step-generation'
import type { DropdownOption } from '@opentrons/components'
import type { ProfileFormError } from '../../../../steplist/formLevel/profileErrors'
import type { FormWarning } from '../../../../steplist/formLevel/warnings'
import type { StepFormErrors } from '../../../../steplist/types'
import type {
  FormData,
  ProfileItem,
  StepFieldName,
  StepType,
  PathOption,
  HydratedFormData,
} from '../../../../form-types'
import type { FormError } from '../../../../steplist/formLevel'
import type { NozzleType } from '../../../../types'
import type { FieldProps, FieldPropsByName, FocusHandlers } from './types'

export function getBlowoutLocationOptionsForForm(args: {
  stepType: StepType
  path?: PathOption | null | undefined
}): DropdownOption[] {
  const { stepType, path } = args
  // TODO: Ian 2019-02-21 use i18n for names
  const destOption = {
    name: i18n.t('shared:destination_well'),
    value: DEST_WELL_BLOWOUT_DESTINATION,
  }
  const sourceOption = {
    name: i18n.t('shared:source_well'),
    value: SOURCE_WELL_BLOWOUT_DESTINATION,
  }

  if (stepType === 'mix') {
    return [destOption]
  } else if (stepType === 'moveLiquid') {
    switch (path) {
      case 'single': {
        return [sourceOption, destOption]
      }

      case 'multiDispense': {
        return [sourceOption, { ...destOption, disabled: true }]
      }

      case 'multiAspirate': {
        return [{ ...sourceOption, disabled: true }, destOption]
      }

      default: {
        // is moveLiquid but no path -- assume we're in batch edit mode
        // with mixed/indeterminate path values
        return [
          { ...sourceOption, disabled: true },
          { ...destOption, disabled: true },
        ]
      }
    }
  }

  return []
}
// TODO: type fieldNames, don't use `string`
export const getDirtyFields = (
  isNewStep: boolean,
  formData?: FormData | null
): string[] => {
  let dirtyFields = []

  if (formData == null) {
    return []
  }

  if (!isNewStep) {
    dirtyFields = Object.keys(formData)
  } else {
    const data = formData
    // new step, but may have auto-populated fields.
    // "Dirty" any fields that differ from default new form values
    const defaultFormData = getDefaultsForStepType(formData.stepType)
    dirtyFields = Object.keys(defaultFormData).reduce(
      (acc: string[], fieldName: StepFieldName) => {
        const currentValue = data[fieldName]
        const initialValue = defaultFormData[fieldName]
        return isEqual(currentValue, initialValue) ? acc : [...acc, fieldName]
      },
      []
    )
  }

  // exclude form "metadata" (not really fields)
  return without(dirtyFields, 'stepType', 'id')
}

export const getIsErrorOnCurrentPage = (args: {
  errors: StepFormErrors
  page: number
}): boolean => {
  const { errors, page = 0 } = args
  return errors.some(error => error.page == null || error.page === page)
}

export const getVisibleFormErrors = (args: {
  focusedField?: string | null
  dirtyFields: string[]
  errors: StepFormErrors
  showErrors?: boolean
  page: number
}): StepFormErrors => {
  const { focusedField, errors, page = 0, showErrors } = args

  return errors.filter(error => {
    const dependentFieldsAreNotFocused = !error.dependentFields.includes(
      // @ts-expect-error(sa, 2021-6-22): focusedField might be undefined
      focusedField
    )

    const isPageImplicated = error.page != null ? page === error.page : true

    return isPageImplicated && dependentFieldsAreNotFocused && showErrors
  })
}
export const getVisibleFormWarnings = (args: {
  focusedField?: string | null
  dirtyFields: string[]
  errors: FormWarning[]
}): FormWarning[] => {
  const { focusedField, dirtyFields, errors } = args
  return errors.filter(error => {
    const dependentFieldsAreNotFocused = !error.dependentFields.includes(
      // @ts-expect-error(sa, 2021-6-22): focusedField might be undefined
      focusedField
    )
    const dependentFieldsAreDirty =
      difference(error.dependentFields, dirtyFields).length === 0
    return dependentFieldsAreNotFocused && dependentFieldsAreDirty
  })
}
// for the purpose of focus handlers, derive a unique ID for each dynamic field
export const getDynamicFieldFocusHandlerId = ({
  id,
  name,
}: {
  id: string
  name: string
}): string => `${id}:${name}`
// NOTE: if any fields of a given name are pristine, treat all fields of that name as pristine.
// (Errors don't currently specify the id, so if we later want to only mask form-level errors
// for specific profile fields, the field's parent ProfileItem id needs to be included in the error)
export const getVisibleProfileFormLevelErrors = (args: {
  focusedField?: string | null
  dirtyFields: string[]
  errors: ProfileFormError[]
  profileItemsById: Record<string, ProfileItem>
}): ProfileFormError[] => {
  const { dirtyFields, focusedField, errors, profileItemsById } = args
  const profileItemIds = Object.keys(profileItemsById)
  return errors.filter(error => {
    return profileItemIds.every(itemId => {
      const item = profileItemsById[itemId]
      const steps = item.type === PROFILE_CYCLE ? item.steps : [item]
      return steps.every(step => {
        const fieldsForStep = error.dependentProfileFields.map(fieldName =>
          getDynamicFieldFocusHandlerId({
            id: step.id,
            name: fieldName,
          })
        )
        const dependentFieldsAreNotFocused = !fieldsForStep.includes(
          // @ts-expect-error(sa, 2021-6-22): focusedField might be undefined
          focusedField
        )
        const dependentProfileFieldsAreDirty =
          difference(fieldsForStep, dirtyFields).length === 0
        return dependentFieldsAreNotFocused && dependentProfileFieldsAreDirty
      })
    })
  })
}
export const getFieldDefaultTooltip = (name: string, t: any): string =>
  name != null ? t(`step_fields.defaults.${name}`) : ''
export const getFieldIndeterminateTooltip = (name: string, t: any): string =>
  name != null ? t(`step_fields.indeterminate.${name}`) : ''
export const getSingleSelectDisabledTooltip = (
  name: string,
  stepType: string,
  t: any
): string =>
  name != null
    ? t(`step_fields.${stepType}.disabled.${name}`)
    : t(`step_fields.${stepType}.disabled.$generic`)

// TODO(IL, 2021-03-03): keys for fieldMap are more strictly of TipOffsetFields type,
// but since utils like addFieldNamePrefix return StepFieldName/string instead
// of strict TipOffsetFields, we have to be more lenient with the types
export function getLabwareFieldForPositioningField(
  name: StepFieldName
): StepFieldName {
  const fieldMap: Record<StepFieldName, StepFieldName> = {
    aspirate_mmFromBottom: 'aspirate_labware',
    aspirate_touchTip_mmFromTop: 'aspirate_labware',
    aspirate_delay_mmFromBottom: 'aspirate_labware',
    dispense_mmFromBottom: 'dispense_labware',
    dispense_touchTip_mmFromTop: 'dispense_labware',
    dispense_delay_mmFromBottom: 'dispense_labware',
    mix_mmFromBottom: 'labware',
    mix_touchTip_mmFromTop: 'labware',
  }
  return fieldMap[name]
}

export const getNozzleType = (
  pipette: PipetteEntity | null,
  nozzles: string | null
): NozzleType | null => {
  const is8Channel = pipette != null && pipette.spec.channels === 8
  if (is8Channel) {
    return '8-channel'
  } else if (nozzles === COLUMN) {
    return COLUMN
  } else if (nozzles === ALL) {
    return ALL
  } else {
    return null
  }
}

interface ShowFieldErrorParams {
  name: StepFieldName
  focusedField: StepFieldName | null
  dirtyFields?: StepFieldName[]
}
export const showFieldErrors = ({
  name,
  focusedField,
  dirtyFields,
}: ShowFieldErrorParams): boolean | undefined | StepFieldName[] =>
  !(name === focusedField) && dirtyFields != null && dirtyFields.includes(name)
export const makeSingleEditFieldProps = (
  focusHandlers: FocusHandlers,
  formData: FormData,
  handleChangeFormInput: (name: string, value: unknown) => void,
  hydratedForm: HydratedFormData,
  t: any
): FieldPropsByName => {
  const { dirtyFields, blur, focusedField, focus } = focusHandlers
  const fieldNames: string[] = Object.keys(
    getDefaultsForStepType(formData.stepType)
  )
  return fieldNames.reduce<FieldPropsByName>((acc, name) => {
    const disabled = hydratedForm
      ? getDisabledFields(hydratedForm).has(name)
      : false
    const value = formData ? formData[name] : null
    const showErrors = showFieldErrors({
      name,
      focusedField,
      dirtyFields,
    })
    const errors = getFieldErrors(name, value)
    const errorToShow =
      showErrors && errors.length > 0 ? errors.join(', ') : null

    const updateValue = (value: unknown): void => {
      handleChangeFormInput(name, value)
    }

    const onFieldBlur = (): void => {
      blur(name)
    }

    const onFieldFocus = (): void => {
      focus(name)
    }

    const defaultTooltip = getFieldDefaultTooltip(name, t)
    const disabledTooltip = getSingleSelectDisabledTooltip(
      name,
      formData.stepType,
      t
    )
    const fieldProps: FieldProps = {
      disabled,
      errorToShow,
      name,
      updateValue,
      value,
      onFieldBlur,
      onFieldFocus,
      tooltipContent: disabled ? disabledTooltip : defaultTooltip,
    }
    return { ...acc, [name]: fieldProps }
  }, {})
}

interface SaveStepSnackbarTextProps {
  numWarnings: number
  numErrors: number
  stepTypeDisplayName: string
  t: any
}
export const getSaveStepSnackbarText = (
  props: SaveStepSnackbarTextProps
): string => {
  const { numWarnings, numErrors, stepTypeDisplayName, t } = props
  if (numWarnings === 0 && numErrors > 0) {
    return t(`protocol_steps:save_errors`, {
      num: numErrors,
      stepType: stepTypeDisplayName,
    })
  } else if (numWarnings > 0 && numErrors === 0) {
    return t(`protocol_steps:save_warnings`, {
      numWarnings: numWarnings,
      stepType: stepTypeDisplayName,
    })
  } else if (numWarnings > 0 && numErrors > 0) {
    return t(`protocol_steps:save_warnings_and_errors`, {
      numWarnings: numWarnings,
      numErrors: numErrors,
      stepType: stepTypeDisplayName,
    })
  } else {
    return t(`protocol_steps:save_no_errors`, { stepType: stepTypeDisplayName })
  }
}

export const capitalizeFirstLetter = (stepName: string): string => {
  // Note - this is a special case
  if (stepName === 'absorbance plate reader') return startCase(stepName)

  // Note - check is for heater-shaker
  if (stepName.includes('-')) {
    return stepName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-')
  } else {
    return `${stepName.charAt(0).toUpperCase()}${stepName.slice(1)}`
  }
}

export type ErrorMappedToField = Record<string, FormError>

export const getFormErrorsMappedToField = (
  formErrors: StepFormErrors
): ErrorMappedToField => {
  return formErrors.reduce<ErrorMappedToField>((acc, error) => {
    const { dependentFields } = error
    for (const field of dependentFields) {
      const { showAtField, showAtForm, title } = error
      if (showAtField == null || showAtForm == null) {
        console.error(
          `${title} should wire up where to show error (at form and/or field)`
        )
      }
      // map each field to only one one error
      acc[field] = {
        ...error,
        showAtField: error.showAtField ?? true,
        showAtForm: error.showAtForm ?? true,
      }
    }
    return acc
  }, {})
}

export const getFormLevelError = (
  fieldName: string,
  mappedErrorsToField: ErrorMappedToField
): string | null => {
  return mappedErrorsToField[fieldName] &&
    mappedErrorsToField[fieldName].showAtField
    ? mappedErrorsToField[fieldName].title
    : null
}
