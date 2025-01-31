import { useTranslation } from 'react-i18next'

import { DIRECTION_COLUMN, Flex } from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { SelectAuthenticationType } from '../../NetworkSettings'

import type { Dispatch, SetStateAction } from 'react'
import type { WifiSecurityType } from '@opentrons/api-client'
import type { SetSettingOption } from '../types'

interface RobotSettingsSelectAuthenticationTypeProps {
  handleWifiConnect: () => void
  selectedAuthType: WifiSecurityType
  setCurrentOption: SetSettingOption
  setSelectedAuthType: Dispatch<SetStateAction<WifiSecurityType>>
}

/**
 * Robot settings page wrapper for shared SelectAuthenticationType organism with child navigation header
 */
export function RobotSettingsSelectAuthenticationType({
  handleWifiConnect,
  selectedAuthType,
  setCurrentOption,
  setSelectedAuthType,
}: RobotSettingsSelectAuthenticationTypeProps): JSX.Element {
  const { i18n, t } = useTranslation('device_settings')

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <ChildNavigation
        buttonText={i18n.format(t('continue'), 'capitalize')}
        header={t('select_a_security_type')}
        onClickBack={() => {
          setCurrentOption('RobotSettingsWifi')
        }}
        onClickButton={() => {
          selectedAuthType !== 'none'
            ? setCurrentOption('RobotSettingsSetWifiCred')
            : handleWifiConnect()
        }}
      />
      <SelectAuthenticationType
        selectedAuthType={selectedAuthType}
        setSelectedAuthType={setSelectedAuthType}
      />
    </Flex>
  )
}
