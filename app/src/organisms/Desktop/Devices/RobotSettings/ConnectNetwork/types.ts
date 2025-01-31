import type { ChangeEventHandler, FocusEventHandler } from 'react'
import type { FieldError } from 'react-hook-form'
import type {
  WifiNetwork,
  EapOption,
  WifiKey,
} from '/app/redux/networking/types'

import type {
  CONNECT,
  DISCONNECT,
  JOIN_OTHER,
  FIELD_TYPE_TEXT,
  FIELD_TYPE_KEY_FILE,
  FIELD_TYPE_SECURITY,
} from './constants'

export type {
  WifiNetwork,
  WifiSecurityType,
  WifiAuthField,
  WifiEapConfig,
  WifiConfigureRequest,
  WifiKey,
  EapOption,
} from '/app/redux/networking/types'

export type NetworkChangeType =
  | typeof CONNECT
  | typeof DISCONNECT
  | typeof JOIN_OTHER

export type NetworkChangeState =
  | { type: typeof CONNECT; ssid: string; network: WifiNetwork }
  | { type: typeof DISCONNECT; ssid: string }
  | { type: typeof JOIN_OTHER; ssid: string | null }
  | { type: null }

export type ConnectFormValues = Partial<{
  ssid?: string
  psk?: string
  // securityType form value may be securityType or eapConfig.eapType
  securityType?: string
  eapConfig?: {
    [eapOption: string]: string
  }
}>

export type ConnectFormErrors = ConnectFormValues & FieldError

interface ConnectFormFieldCommon {
  name: string
  label: string
}

export interface ConnectFormTextField extends ConnectFormFieldCommon {
  type: typeof FIELD_TYPE_TEXT
  isPassword: boolean
}

export interface ConnectFormKeyField extends ConnectFormFieldCommon {
  type: typeof FIELD_TYPE_KEY_FILE
  robotName: string
  wifiKeys: WifiKey[]
  placeholder: string
}

// UI only auth field; server will never return this field type
export interface ConnectFormSecurityField extends ConnectFormFieldCommon {
  type: typeof FIELD_TYPE_SECURITY
  eapOptions: EapOption[]
  showAllOptions: boolean
  placeholder: string
}

export type ConnectFormField =
  | ConnectFormTextField
  | ConnectFormKeyField
  | ConnectFormSecurityField

export type ConnectFormFieldProps = Readonly<{
  value: string | null
  error: string | null
  onChange: ChangeEventHandler
  onBlur: FocusEventHandler
  setValue: (value: string) => unknown
  setTouched: (touched: boolean) => unknown
}>
