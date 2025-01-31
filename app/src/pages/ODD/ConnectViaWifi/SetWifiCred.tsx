import { useTranslation } from 'react-i18next'

import { Flex, DIRECTION_COLUMN } from '@opentrons/components'

import { SetWifiCred as SetWifiCredComponent } from '/app/organisms/ODD/NetworkSettings'
import { RobotSetupHeader } from '/app/organisms/ODD/RobotSetupHeader'

import type { Dispatch, SetStateAction } from 'react'
import type { WifiScreenOption } from './'

interface SetWifiCredProps {
  handleConnect: () => void
  password: string
  setCurrentOption: (option: WifiScreenOption) => void
  setPassword: Dispatch<SetStateAction<string>>
}

export function SetWifiCred({
  handleConnect,
  password,
  setCurrentOption,
  setPassword,
}: SetWifiCredProps): JSX.Element {
  const { t } = useTranslation('device_settings')

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <RobotSetupHeader
        buttonText={t('connect')}
        header={t('sign_into_wifi')}
        onClickBack={() => {
          setCurrentOption('SelectAuthType')
        }}
        onClickButton={handleConnect}
      />
      <SetWifiCredComponent password={password} setPassword={setPassword} />
    </Flex>
  )
}
