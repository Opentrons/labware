import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Flex, DIRECTION_COLUMN } from '@opentrons/components'

import { SetWifiSsid } from '/app/organisms/ODD/NetworkSettings'
import { RobotSetupHeader } from '/app/organisms/ODD/RobotSetupHeader'

import type { Dispatch, SetStateAction } from 'react'
import type { WifiScreenOption } from './'

interface JoinOtherNetworkProps {
  setCurrentOption: (option: WifiScreenOption) => void
  setSelectedSsid: Dispatch<SetStateAction<string>>
}

export function JoinOtherNetwork({
  setCurrentOption,
  setSelectedSsid,
}: JoinOtherNetworkProps): JSX.Element {
  const { i18n, t } = useTranslation('device_settings')

  const [inputSsid, setInputSsid] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleContinue = (): void => {
    if (inputSsid.length >= 2 && inputSsid.length <= 32) {
      setSelectedSsid(inputSsid)
      setCurrentOption('SelectAuthType')
    } else {
      setErrorMessage(t('join_other_network_error_message') as string)
    }
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <RobotSetupHeader
        buttonText={i18n.format(t('continue'), 'capitalize')}
        header={t('join_other_network')}
        onClickBack={() => {
          setCurrentOption('WifiList')
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
