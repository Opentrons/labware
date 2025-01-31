import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ToggleButton } from '/app/atoms/buttons'
import { updateSetting } from '/app/redux/robot-settings'

import type { MouseEventHandler } from 'react'
import type { Dispatch } from '/app/redux/types'
import type { RobotSettingsField } from '/app/redux/robot-settings/types'

interface UsageSettingsProps {
  settings: RobotSettingsField | undefined
  robotName: string
  isRobotBusy: boolean
}

export function UsageSettings({
  settings,
  robotName,
  isRobotBusy,
}: UsageSettingsProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'enableDoorSafetySwitch'

  const handleClick: MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginTop={SPACING.spacing24}
    >
      <Box width="70%">
        <LegacyStyledText
          css={TYPOGRAPHY.h2SemiBold}
          marginBottom={SPACING.spacing16}
          id="AdvancedSettings_UsageSettings"
        >
          {t('usage_settings')}
        </LegacyStyledText>
        <LegacyStyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          marginBottom={SPACING.spacing4}
        >
          {t('pause_protocol')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          {t('pause_protocol_description')}
        </LegacyStyledText>
      </Box>
      <ToggleButton
        label="usage_settings_pause_protocol"
        toggledOn={settings?.value === true}
        onClick={handleClick}
        id="RobotSettings_usageSettingsToggleButton"
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
