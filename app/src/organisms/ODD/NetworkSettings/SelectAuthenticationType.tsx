import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  RadioButton,
} from '@opentrons/components'

import { getLocalRobot } from '/app/redux/discovery'
import { getNetworkInterfaces, fetchStatus } from '/app/redux/networking'
import { useIsUnboxingFlowOngoing } from '/app/redux-resources/config'
import { AlternativeSecurityTypeModal } from './AlternativeSecurityTypeModal'

import type { ChangeEvent } from 'react'
import type { WifiSecurityType } from '@opentrons/api-client'
import type { Dispatch, State } from '/app/redux/types'

interface SelectAuthenticationTypeProps {
  selectedAuthType: WifiSecurityType
  setSelectedAuthType: (authType: WifiSecurityType) => void
}

export function SelectAuthenticationType({
  selectedAuthType,
  setSelectedAuthType,
}: SelectAuthenticationTypeProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  const dispatch = useDispatch<Dispatch>()
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const isUnboxingFlowOngoing = useIsUnboxingFlowOngoing()
  const { wifi } = useSelector((state: State) =>
    getNetworkInterfaces(state, robotName)
  )
  const [
    showAlternativeSecurityTypeModal,
    setShowAlternativeSecurityTypeModal,
  ] = useState<boolean>(false)

  const securityButtons = [
    {
      label: t('wpa2_personal'),
      subLabel: t('wpa2_personal_description'),
      value: 'wpa-psk',
    },
    {
      label: t('shared:none'),
      subLabel: t('none_description'),
      value: 'none',
    },
  ]

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setSelectedAuthType(event.target.value as WifiSecurityType)
  }

  useEffect(() => {
    dispatch(fetchStatus(robotName))
  }, [robotName, dispatch])

  return (
    <>
      {showAlternativeSecurityTypeModal ? (
        <AlternativeSecurityTypeModal
          setShowAlternativeSecurityTypeModal={
            setShowAlternativeSecurityTypeModal
          }
        />
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`}
      >
        <Flex
          alignItems={ALIGN_CENTER}
          flexDirection={DIRECTION_COLUMN}
          marginTop={isUnboxingFlowOngoing ? undefined : '7.75rem'}
        >
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            width="100%"
          >
            {securityButtons.map(radio => (
              <RadioButton
                key={radio.label}
                buttonLabel={radio.label}
                buttonValue={radio.value}
                onChange={handleChange}
                subButtonLabel={radio.subLabel ?? undefined}
                isSelected={radio.value === selectedAuthType}
              />
            ))}
          </Flex>
          <Flex marginY={SPACING.spacing24}>
            <LegacyStyledText
              as="h4"
              fontWeight={TYPOGRAPHY.fontWeightRegular}
              color={COLORS.grey60}
            >
              {t('your_mac_address_is', { macAddress: wifi?.macAddress })}
            </LegacyStyledText>
          </Flex>
          <Btn
            display={DISPLAY_FLEX}
            width="100%"
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_CENTER}
            onClick={() => {
              setShowAlternativeSecurityTypeModal(true)
            }}
            padding={`${SPACING.spacing16} ${SPACING.spacing24}`}
          >
            <LegacyStyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              color={COLORS.grey60}
            >
              {t('need_another_security_type')}
            </LegacyStyledText>
          </Btn>
        </Flex>
      </Flex>
    </>
  )
}
