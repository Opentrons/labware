import { useTranslation } from 'react-i18next'
import { SelectField } from '@opentrons/components'

import { SECURITY_NONE, SECURITY_WPA_PSK } from '../constants'
import { useConnectFormField } from './form-state'
import { FormRow } from './FormRow'

import type { EapOption } from '../types'
import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
} from 'react-hook-form'

export interface SecurityFieldProps {
  id: string
  name: string
  placeholder: string
  label: string
  showAllOptions: boolean
  eapOptions: EapOption[]
  field: ControllerRenderProps<FieldValues, any>
  fieldState: ControllerFieldState
  className?: string
}

const ALL_SECURITY_OPTIONS = [
  { options: [{ value: SECURITY_NONE, label: 'shared:none' }] },
  { options: [{ value: SECURITY_WPA_PSK, label: 'wpa2_personal' }] },
]

const makeEapOptionsGroup = (
  eapOptions: EapOption[]
): { options: Array<{ value: string; label: string }> } => ({
  options: eapOptions.map(opt => ({
    value: opt.name,
    label: opt.displayName ?? opt.name,
  })),
})

export const SecurityField = (props: SecurityFieldProps): JSX.Element => {
  const { t } = useTranslation(['device_settings', 'shared'])
  const {
    id,
    name,
    placeholder,
    label,
    showAllOptions,
    eapOptions,
    className,
    field,
    fieldState,
  } = props

  const { value, error, setValue, setTouched } = useConnectFormField(
    field,
    fieldState
  )

  const options = [
    ...(showAllOptions ? ALL_SECURITY_OPTIONS : []),
    makeEapOptionsGroup(eapOptions),
  ]

  return (
    <FormRow label={t(label)} labelFor={id}>
      <SelectField
        {...{
          id,
          name,
          value,
          error,
          placeholder,
          options,
          className,
          menuPosition: 'fixed',
          onValueChange: (_, value) => setValue(value),
          onLoseFocus: () => setTouched(true),
        }}
      />
    </FormRow>
  )
}
