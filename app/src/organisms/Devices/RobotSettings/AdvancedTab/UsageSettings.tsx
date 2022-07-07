import * as React from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
} from '@opentrons/components'

import { StyledText } from '../../../../atoms/text'
import { ToggleButton } from '../../../../atoms/buttons'
import { useIsRobotBusy } from '../../hooks'
import { updateSetting } from '../../../../redux/robot-settings'

import type { Dispatch } from '../../../../redux/types'
import type { RobotSettingsField } from '../../../../redux/robot-settings/types'

interface UsageSettingsProps {
  settings: RobotSettingsField | undefined
  robotName: string
  updateIsRobotBusy: (isRobotBusy: boolean) => void
}

export function UsageSettings({
  settings,
  robotName,
  updateIsRobotBusy,
}: UsageSettingsProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'enableDoorSafetySwitch'
  const isBusy = useIsRobotBusy()

  const handleClick: React.MouseEventHandler<Element> = () => {
    if (isBusy) {
      updateIsRobotBusy(true)
    } else {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginTop={SPACING.spacing5}
    >
      <Flex width="70%" flexDirection={DIRECTION_COLUMN}>
        <StyledText
          css={TYPOGRAPHY.h2SemiBold}
          marginBottom={SPACING.spacing4}
          id="AdvancedSettings_UsageSettings"
        >
          {t('usage_settings')}
        </StyledText>
        <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {t('pause_protocol')}
        </StyledText>
        <StyledText as="p">{t('pause_protocol_description')}</StyledText>
      </Flex>
      <ToggleButton
        label="usage_settings_pause_protocol"
        toggledOn={settings?.value === true}
        onClick={handleClick}
        id="RobotSettings_usageSettingsToggleButton"
      />
    </Flex>
  )
}
