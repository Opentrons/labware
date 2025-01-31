import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { SelectField } from '@opentrons/components'
import { FormRow } from './FormRow'
import { UploadKeyInput } from './UploadKeyInput'
import { useConnectFormField } from './form-state'

import type { WifiKey } from '../types'
import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
} from 'react-hook-form'

export interface KeyFileFieldProps {
  id: string
  name: string
  label: string
  placeholder: string
  robotName: string
  wifiKeys: WifiKey[]
  field: ControllerRenderProps<FieldValues, any>
  fieldState: ControllerFieldState
  className?: string
}

const ADD_NEW_KEY_VALUE = '__addNewKey__'

const makeKeyOptions = (
  keys: WifiKey[]
): { options: Array<{ value: string; label: string }> } => ({
  options: keys.map(k => ({ value: k.id, label: k.name })),
})

export const KeyFileField = (props: KeyFileFieldProps): JSX.Element => {
  const {
    id,
    name,
    label,
    placeholder,
    robotName,
    wifiKeys,
    field,
    fieldState,
  } = props
  const { t } = useTranslation('device_settings')
  const ADD_NEW_KEY_OPTION_GROUP = {
    options: [{ value: ADD_NEW_KEY_VALUE, label: t('add_new') }],
  }

  const { value, error, setValue, setTouched } = useConnectFormField(
    field,
    fieldState
  )
  const options = [makeKeyOptions(wifiKeys), ADD_NEW_KEY_OPTION_GROUP]
  const uploadKeyRef = useRef<HTMLInputElement>(null)

  const handleValueChange = (_: string, value: string): void => {
    if (value === ADD_NEW_KEY_VALUE) {
      uploadKeyRef.current && uploadKeyRef.current.click()
    } else {
      setValue(value)
    }
  }

  return (
    <>
      <FormRow label={label} labelFor={id}>
        <SelectField
          {...{
            id,
            name,
            placeholder,
            value,
            error,
            options,
            onValueChange: handleValueChange,
            onLoseFocus: () => setTouched(true),
          }}
        />
      </FormRow>
      <UploadKeyInput
        ref={uploadKeyRef}
        label={t('add_new')}
        robotName={robotName}
        onUpload={setValue}
      />
    </>
  )
}
