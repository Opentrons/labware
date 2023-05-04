import { ToggleButton } from '../../../../atoms/buttons'
import { StyledText } from '../../../../atoms/text'
import { updateSetting } from '../../../../redux/robot-settings'
import type { RobotSettingsField } from '../../../../redux/robot-settings/types'
import type { Dispatch } from '../../../../redux/types'
import {
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  Box,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

interface ShortTrashBinProps {
  settings: RobotSettingsField | undefined
  robotName: string
  isRobotBusy: boolean
}

export function ShortTrashBin({
  settings,
  robotName,
  isRobotBusy,
}: ShortTrashBinProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'shortTrashBin'

  const handleClick: React.MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <Box width="70%">
        <StyledText
          css={TYPOGRAPHY.pSemiBold}
          paddingBottom={SPACING.spacing4}
          id="AdvancedSettings_devTools"
        >
          {t('short_trash_bin')}
        </StyledText>
        <StyledText css={TYPOGRAPHY.pRegular}>
          {t('short_trash_bin_description')}
        </StyledText>
      </Box>
      <ToggleButton
        label="short_trash_bin"
        toggledOn={settings?.value === true}
        onClick={handleClick}
        id="AdvancedSettings_shortTrashBin"
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
