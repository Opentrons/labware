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

interface LegacySettingsProps {
  settings: RobotSettingsField | undefined
  robotName: string
  isRobotBusy: boolean
}

export function LegacySettings({
  settings,
  robotName,
  isRobotBusy,
}: LegacySettingsProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'deckCalibrationDots'

  const handleClick: MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginTop={SPACING.spacing40}
    >
      <Box width="70%">
        <LegacyStyledText
          as="h2"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          marginBottom={SPACING.spacing16}
          id="AdvancedSettings_showLink"
        >
          {t('legacy_settings')}
        </LegacyStyledText>
        <LegacyStyledText as="p" css={TYPOGRAPHY.pSemiBold}>
          {t('calibrate_deck_to_dots')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          {t('calibrate_deck_description')}
        </LegacyStyledText>
      </Box>
      <ToggleButton
        label="legacy_settings"
        toggledOn={settings?.value === true}
        onClick={handleClick}
        id="RobotSettings_legacySettingsToggleButton"
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
