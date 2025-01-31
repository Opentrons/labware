import get from 'lodash/get'

import * as Constants from '../constants'

import type { FieldError } from 'react-hook-form'
import type { TFunction } from 'i18next'
import type {
  WifiNetwork,
  WifiKey,
  EapOption,
  WifiAuthField,
  WifiConfigureRequest,
  WifiSecurityType,
  WifiEapConfig,
  ConnectFormValues,
  ConnectFormErrors,
  ConnectFormField,
  ConnectFormTextField,
  ConnectFormSecurityField,
} from '../types'

type Errors = Record<string, FieldError>

export const renderLabel = (label: string, required: boolean): string =>
  `${required ? '* ' : ''}${label}`

const makeFieldSsid = (t: TFunction): ConnectFormTextField => ({
  type: Constants.FIELD_TYPE_TEXT,
  name: Constants.CONFIGURE_FIELD_SSID,
  label: renderLabel(t('network_name'), true),
  isPassword: false,
})

const makeFieldPsk = (t: TFunction): ConnectFormTextField => ({
  type: Constants.FIELD_TYPE_TEXT,
  name: Constants.CONFIGURE_FIELD_PSK,
  label: renderLabel(t('password'), true),
  isPassword: true,
})

const makeSecurityField = (
  eapOptions: EapOption[],
  showAllOptions: boolean,
  t: TFunction
): ConnectFormSecurityField => ({
  type: Constants.FIELD_TYPE_SECURITY,
  name: Constants.CONFIGURE_FIELD_SECURITY_TYPE,
  label: renderLabel(t('authentication'), true),
  placeholder: t('select_auth_method_short'),
  eapOptions,
  showAllOptions,
})

const getEapIsSelected = (formSecurityType?: string | null): boolean => {
  return (
    formSecurityType != null &&
    formSecurityType !== Constants.SECURITY_NONE &&
    formSecurityType !== Constants.SECURITY_WPA_PSK
  )
}

const getEapFields = (
  eapOptions: EapOption[],
  values: ConnectFormValues,
  errors?: ConnectFormErrors,
  touched?: boolean
): WifiAuthField[] => {
  const eapType = values.securityType
  return eapOptions
    .filter(opt => opt.name === eapType)
    .flatMap(opt => opt.options)
}

const getEapFieldName = (baseName: string): string => `eapConfig.${baseName}`

export function getConnectFormFields(
  network: WifiNetwork | null,
  robotName: string,
  eapOptions: EapOption[],
  wifiKeys: WifiKey[],
  values: ConnectFormValues,
  t: TFunction
): ConnectFormField[] {
  const { securityType: formSecurityType } = values
  const fields = []

  // if the network is unknown, display a field to enter the SSID
  if (network === null) {
    fields.push(makeFieldSsid(t))
  }

  // if the network is unknown or the known network is EAP, display a
  // security dropdown; security dropdown will handle which options to
  // display based on known or unknown network
  if (!network || network.securityType === Constants.SECURITY_WPA_EAP) {
    fields.push(makeSecurityField(eapOptions, !network, t))
  }

  // if known network is PSK or network is unknown and user has selected PSK
  // display a password field for the PSK
  if (
    network?.securityType === Constants.SECURITY_WPA_PSK ||
    formSecurityType === Constants.SECURITY_WPA_PSK
  ) {
    fields.push(makeFieldPsk(t))
  }

  // if known network is EAP or user selected EAP, map eap options to fields
  if (
    network?.securityType === Constants.SECURITY_WPA_EAP ||
    getEapIsSelected(formSecurityType)
  ) {
    fields.push(
      ...getEapFields(eapOptions, values).map(field => {
        const { type } = field
        const name = getEapFieldName(field.name)
        const label = renderLabel(field.displayName, field.required)

        if (type === Constants.AUTH_TYPE_FILE) {
          return {
            type: Constants.FIELD_TYPE_KEY_FILE,
            name,
            label,
            robotName,
            wifiKeys,
            placeholder: t('select_file'),
          }
        }

        return {
          type: Constants.FIELD_TYPE_TEXT,
          name,
          label,
          isPassword: type === Constants.AUTH_TYPE_PASSWORD,
        }
      })
    )
  }

  return fields
}

export function validateConnectFormFields(
  network: WifiNetwork | null,
  eapOptions: EapOption[],
  values: ConnectFormValues,
  errors: Errors,
  t: TFunction
): Errors {
  const {
    ssid: formSsid,
    securityType: formSecurityType,
    psk: formPsk,
  } = values
  let errorMessage: string | undefined

  if (network === null && (formSsid == null || formSsid.length === 0)) {
    errorMessage = t('field_is_required', { field: t('network_name') })
    return errorMessage != null
      ? {
          ...errors,
          ssid: {
            type: 'ssidError',
            message: errorMessage,
          },
        }
      : errors
  }

  if (
    (network === null || network.securityType === Constants.SECURITY_WPA_EAP) &&
    !formSecurityType
  ) {
    errorMessage = t('field_is_required', { field: t('authentication') })
    return errorMessage != null
      ? {
          ...errors,
          securityType: {
            type: 'securityTypeError',
            message: errorMessage,
          },
        }
      : errors
  }

  if (
    (network?.securityType === Constants.SECURITY_WPA_PSK ||
      formSecurityType === Constants.SECURITY_WPA_PSK) &&
    (!formPsk || formPsk.length < Constants.CONFIGURE_PSK_MIN_LENGTH)
  ) {
    errorMessage = t('password_not_long_enough', {
      minLength: Constants.CONFIGURE_PSK_MIN_LENGTH,
    })
    return errorMessage != null
      ? {
          ...errors,
          psk: {
            type: 'pskError',
            message: errorMessage,
          },
        }
      : errors
  }

  if (
    network?.securityType === Constants.SECURITY_WPA_EAP ||
    getEapIsSelected(formSecurityType)
  ) {
    const eapFieldErrors = getEapFields(eapOptions, values)
      .filter(
        ({ name, required }) => required && !get(values, getEapFieldName(name))
      )
      .reduce(
        (
          acc: Errors,
          { name, displayName }: Pick<EapOption, 'name' | 'displayName'>
        ) => {
          const fieldName = getEapFieldName(name)
          const errorMessage =
            displayName != null
              ? t('field_is_required', { field: displayName })
              : ''

          if (errorMessage != null) {
            acc[fieldName] = {
              type: 'eapError',
              message: errorMessage,
            }
          }

          return acc
        },
        {}
      )

    return Object.keys(eapFieldErrors).length > 0
      ? {
          ...errors,
          ...eapFieldErrors,
        }
      : errors
  }

  return errors
}

export const connectFormToConfigureRequest = (
  network: WifiNetwork | null,
  values: ConnectFormValues
): WifiConfigureRequest | null => {
  const {
    ssid: formSsid,
    securityType: formSecurityType,
    psk: formPsk,
    eapConfig: formEapConfig,
  } = values

  const ssid = network?.ssid ?? formSsid ?? null
  let securityType: WifiSecurityType | null = null
  let eapConfig: WifiEapConfig | null = null

  if (getEapIsSelected(formSecurityType)) {
    securityType = Constants.SECURITY_WPA_EAP
    // @ts-expect-error TODO: formSecurityType could be undefined, but eapType expects string
    eapConfig = { eapType: formSecurityType }
  } else if (network != null) {
    securityType = network.securityType
  } else if (
    values.securityType === Constants.SECURITY_NONE ||
    values.securityType === Constants.SECURITY_WPA_PSK
  ) {
    securityType = values.securityType as WifiSecurityType
  }

  if (ssid !== null && securityType !== null) {
    const options: WifiConfigureRequest = {
      ssid,
      securityType,
      hidden: network === null,
    }

    if (formPsk != null) options.psk = formPsk
    if (eapConfig != null)
      options.eapConfig = { ...eapConfig, ...formEapConfig }
    return options
  }

  return null
}
