import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'

import {
  LegacyInputField,
  DeprecatedCheckboxField,
  INPUT_TYPE_TEXT,
  INPUT_TYPE_PASSWORD,
} from '@opentrons/components'

import { FormRow } from './FormRow'
import { useConnectFormField } from './form-state'
import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
} from 'react-hook-form'

export interface TextFieldProps {
  id: string
  name: string
  label: string
  isPassword: boolean
  field: ControllerRenderProps<FieldValues, any>
  fieldState: ControllerFieldState
  className?: string
}

export const TextField = (props: TextFieldProps): JSX.Element => {
  const { t } = useTranslation('device_settings')
  const { id, name, label, isPassword, className, field, fieldState } = props
  const { value, error, onChange, onBlur } = useConnectFormField(
    field,
    fieldState
  )
  const [showPw, toggleShowPw] = useReducer(show => !show, false)
  const type = isPassword && !showPw ? INPUT_TYPE_PASSWORD : INPUT_TYPE_TEXT

  return (
    <FormRow label={label} labelFor={id}>
      <LegacyInputField
        {...{ className, type, id, name, value, error, onChange, onBlur }}
      />
      {isPassword && (
        <DeprecatedCheckboxField
          label={t('show_password')}
          value={showPw}
          onChange={toggleShowPw}
        />
      )}
    </FormRow>
  )
}
