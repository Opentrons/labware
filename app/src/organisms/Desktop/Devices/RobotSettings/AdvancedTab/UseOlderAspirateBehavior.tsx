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

interface UseOlderAspirateBehaviorProps {
  settings: RobotSettingsField | undefined
  robotName: string
  isRobotBusy: boolean
}

export function UseOlderAspirateBehavior({
  settings,
  robotName,
  isRobotBusy,
}: UseOlderAspirateBehaviorProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'useOldAspirationFunctions'

  const handleClick: MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <Box width="70%">
        <LegacyStyledText
          css={TYPOGRAPHY.pSemiBold}
          paddingBottom={SPACING.spacing4}
          id="AdvancedSettings_devTools"
        >
          {t('use_older_aspirate')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          {t('use_older_aspirate_description')}
        </LegacyStyledText>
      </Box>
      <ToggleButton
        label="use_older_aspirate_behavior"
        toggledOn={settings?.value === true}
        onClick={handleClick}
        id="AdvancedSettings_useOlderAspirate"
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
