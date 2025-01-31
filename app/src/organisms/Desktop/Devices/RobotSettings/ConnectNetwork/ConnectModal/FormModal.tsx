import { Controller } from 'react-hook-form'
import styled, { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  FONT_SIZE_BODY_1,
  BUTTON_TYPE_SUBMIT,
  Flex,
} from '@opentrons/components'
import { SECURITY_WPA_PSK, SECURITY_WPA_EAP } from '/app/redux/networking'
import { ScrollableAlertModal } from '/app/molecules/modals'
import { TextField } from './TextField'
import { KeyFileField } from './KeyFileField'
import { SecurityField } from './SecurityField'
import { FIELD_TYPE_KEY_FILE, FIELD_TYPE_SECURITY } from '../constants'

import type { Control } from 'react-hook-form'
import type { ConnectFormField, ConnectFormValues, WifiNetwork } from '../types'

const fieldStyle = css`
  min-width: 12rem;
`
const StyledCopy = styled.p`
  margin: 0 1rem 1rem;
`

const StyledFlex = styled(Flex)`
  font-size: ${FONT_SIZE_BODY_1};
  display: table;
  width: 80%;
  margin-top: 0.5rem;
`

const LegacyStyledTextField = styled(TextField)`
  ${fieldStyle}
`

const StyledKeyFileField = styled(KeyFileField)`
  ${fieldStyle}
`

const StyledSecurityField = styled(SecurityField)`
  ${fieldStyle}
`

export interface FormModalProps {
  id: string
  network: WifiNetwork | null
  fields: ConnectFormField[]
  isValid: boolean
  onCancel: () => void
  control: Control<ConnectFormValues, any>
}

export const FormModal = (props: FormModalProps): JSX.Element => {
  const { id, network, fields, isValid, onCancel, control } = props
  const { t } = useTranslation(['device_settings', 'shared'])

  const heading =
    network !== null
      ? t('connect_to_ssid', { ssid: network.ssid })
      : t('find_and_join_network')

  let bodyText = t('enter_name_security_type')
  if (network != null) {
    if (network.securityType === SECURITY_WPA_PSK) {
      bodyText = t('network_requires_wpa_password', { ssid: network.ssid })
    } else if (network.securityType === SECURITY_WPA_EAP) {
      bodyText = t('network_requires_auth', { ssid: network.ssid })
    } else {
      bodyText = t('network_is_unsecured', { ssid: network.ssid })
    }
  }

  return (
    <ScrollableAlertModal
      alertOverlay
      heading={heading}
      iconName="wifi"
      onCloseClick={onCancel}
      buttons={[
        { children: t('shared:cancel'), onClick: props.onCancel },
        {
          children: t('connect'),
          type: BUTTON_TYPE_SUBMIT,
          form: id,
          disabled: !isValid,
        },
      ]}
    >
      <StyledCopy>{bodyText}</StyledCopy>
      <StyledFlex id={id}>
        {fields.map(fieldProps => {
          const { name } = fieldProps
          const fieldId = `${id}__${name}`

          if (fieldProps.type === FIELD_TYPE_SECURITY) {
            return (
              <Controller
                key={name}
                control={control}
                //  @ts-expect-error: ts can't tell that name is the correct value
                name={name}
                render={({ field, fieldState }) => (
                  <StyledSecurityField
                    key={name}
                    id={fieldId}
                    {...fieldProps}
                    field={field}
                    fieldState={fieldState}
                  />
                )}
              />
            )
          }

          if (fieldProps.type === FIELD_TYPE_KEY_FILE) {
            return (
              <Controller
                key={name}
                control={control}
                //  @ts-expect-error: ts can't tell that name is the correct value
                name={name}
                render={({ field, fieldState }) => (
                  <StyledKeyFileField
                    key={name}
                    id={fieldId}
                    {...fieldProps}
                    field={field}
                    fieldState={fieldState}
                  />
                )}
              />
            )
          }

          return (
            <Controller
              key={name}
              control={control}
              //  @ts-expect-error: ts can't tell that name is the correct value
              name={name}
              render={({ field, fieldState }) => (
                <LegacyStyledTextField
                  key={name}
                  id={fieldId}
                  {...fieldProps}
                  field={field}
                  fieldState={fieldState}
                />
              )}
            />
          )
        })}
      </StyledFlex>
    </ScrollableAlertModal>
  )
}
