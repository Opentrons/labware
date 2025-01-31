import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { DIRECTION_COLUMN, Flex } from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { SetWifiSsid } from '../../NetworkSettings'

import type { Dispatch, SetStateAction } from 'react'
import type { SetSettingOption } from '../types'

interface RobotSettingsJoinOtherNetworkProps {
  setCurrentOption: SetSettingOption
  setSelectedSsid: Dispatch<SetStateAction<string>>
}

/**
 * Robot settings page wrapper for shared SetWifiSsid organism with child navigation header
 */
export function RobotSettingsJoinOtherNetwork({
  setCurrentOption,
  setSelectedSsid,
}: RobotSettingsJoinOtherNetworkProps): JSX.Element {
  const { i18n, t } = useTranslation('device_settings')

  const [inputSsid, setInputSsid] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleContinue = (): void => {
    if (inputSsid.length >= 2 && inputSsid.length <= 32) {
      setSelectedSsid(inputSsid)
      setCurrentOption('RobotSettingsSelectAuthenticationType')
    } else {
      setErrorMessage(t('join_other_network_error_message') as string)
    }
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <ChildNavigation
        buttonText={i18n.format(t('continue'), 'capitalize')}
        header={t('join_other_network')}
        onClickBack={() => {
          setCurrentOption('RobotSettingsWifi')
        }}
        onClickButton={handleContinue}
      />
      <SetWifiSsid
        errorMessage={errorMessage}
        inputSsid={inputSsid}
        setInputSsid={setInputSsid}
      />
    </Flex>
  )
}
