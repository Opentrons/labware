import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useResetFormOnSecurityChange } from './form-state'
import {
  getConnectFormFields,
  validateConnectFormFields,
  connectFormToConfigureRequest,
} from './form-fields'

import { FormModal } from './FormModal'

import type { Control, Resolver } from 'react-hook-form'
import type { TFunction } from 'i18next'
import type {
  ConnectFormValues,
  WifiConfigureRequest,
  WifiNetwork,
  WifiKey,
  EapOption,
} from '../types'

export interface ConnectModalProps {
  robotName: string
  network: WifiNetwork | null
  wifiKeys: WifiKey[]
  eapOptions: EapOption[]
  onConnect: (r: WifiConfigureRequest) => void
  onCancel: () => void
}

interface ConnectModalComponentProps extends ConnectModalProps {
  isValid: boolean
  values: ConnectFormValues
  control: Control<ConnectFormValues, any>
  id: string
}

export const ConnectModal = (props: ConnectModalProps): JSX.Element => {
  const { t } = useTranslation(['device_settings', 'shared'])
  const { network, eapOptions, onConnect } = props

  const onSubmit = (values: ConnectFormValues): void => {
    const request = connectFormToConfigureRequest(network, values)
    if (request) onConnect(request)
  }

  const handleValidate: Resolver<ConnectFormValues> = values => {
    let errors = {}

    errors = validateConnectFormFields(
      network,
      eapOptions,
      values,
      errors,
      t as TFunction
    )
    return { values, errors }
  }

  const {
    handleSubmit,
    formState: { isValid },
    getValues,
    control,
  } = useForm<ConnectFormValues>({
    defaultValues: {},
    resolver: handleValidate,
  })

  const values = getValues()
  const id = `ConnectForm__${props.robotName}`

  return (
    <form onSubmit={handleSubmit(onSubmit)} id={id}>
      <ConnectModalComponent
        {...props}
        control={control}
        values={values}
        isValid={isValid}
        id={id}
      />
    </form>
  )
}

export const ConnectModalComponent = (
  props: ConnectModalComponentProps
): JSX.Element => {
  const { t } = useTranslation(['device_settings', 'shared'])
  const {
    robotName,
    network,
    wifiKeys,
    eapOptions,
    onCancel,
    values,
    isValid,
    id,
    control,
  } = props

  const fields = getConnectFormFields(
    network,
    robotName,
    eapOptions,
    wifiKeys,
    values,
    t as TFunction
  )

  useResetFormOnSecurityChange()

  return (
    <FormModal
      {...{
        id,
        network,
        fields,
        isValid,
        onCancel,
        control,
      }}
    />
  )
}
