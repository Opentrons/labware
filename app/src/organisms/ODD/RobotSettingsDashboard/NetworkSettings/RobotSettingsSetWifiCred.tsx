import { useTranslation } from 'react-i18next'

import { DIRECTION_COLUMN, Flex } from '@opentrons/components'

import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { SetWifiCred } from '../../NetworkSettings/SetWifiCred'

import type { Dispatch, SetStateAction } from 'react'
import type { SetSettingOption } from '../types'

interface RobotSettingsSetWifiCredProps {
  handleConnect: () => void
  password: string
  setCurrentOption: SetSettingOption
  setPassword: Dispatch<SetStateAction<string>>
}

/**
 * Robot settings page wrapper for shared SetWifiCred organism with child navigation header
 */
export function RobotSettingsSetWifiCred({
  handleConnect,
  password,
  setCurrentOption,
  setPassword,
}: RobotSettingsSetWifiCredProps): JSX.Element {
  const { t } = useTranslation('device_settings')

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <ChildNavigation
        buttonText={t('connect')}
        header={t('wifi')}
        onClickBack={() => {
          setCurrentOption('RobotSettingsWifi')
        }}
        onClickButton={handleConnect}
      />
      <SetWifiCred password={password} setPassword={setPassword} />
    </Flex>
  )
}
