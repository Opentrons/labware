import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  LegacyStyledText,
  POSITION_FIXED,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { FullKeyboard } from '/app/atoms/SoftwareKeyboard'
import { useIsUnboxingFlowOngoing } from '/app/redux-resources/config'

import type { Dispatch, SetStateAction } from 'react'

interface SetWifiSsidProps {
  errorMessage?: string | null
  inputSsid: string
  setInputSsid: Dispatch<SetStateAction<string>>
}

export function SetWifiSsid({
  errorMessage,
  inputSsid,
  setInputSsid,
}: SetWifiSsidProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  const keyboardRef = useRef(null)
  const isUnboxingFlowOngoing = useIsUnboxingFlowOngoing()

  return (
    <>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        paddingX="6.34375rem"
        gridGap={SPACING.spacing8}
        marginTop={isUnboxingFlowOngoing ? undefined : '7.75rem'}
      >
        <LegacyStyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightRegular}
          color={errorMessage != null ? COLORS.red50 : COLORS.black90}
        >
          {t('enter_network_name')}
        </LegacyStyledText>
        <InputField
          aria-label="wifi_ssid"
          value={inputSsid}
          id="wifiSsid"
          onChange={e => {
            setInputSsid(e.target.value)
          }}
          type="text"
          error={errorMessage}
          onBlur={e => {
            e.target.focus()
          }}
          autoFocus
        />
      </Flex>
      <Flex width="100%" position={POSITION_FIXED} left="0" bottom="0">
        <FullKeyboard
          onChange={e => {
            e != null && setInputSsid(e)
          }}
          keyboardRef={keyboardRef}
        />
      </Flex>
    </>
  )
}
