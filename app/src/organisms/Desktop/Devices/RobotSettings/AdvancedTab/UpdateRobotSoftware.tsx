import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  Banner,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  DIRECTION_COLUMN,
  SPACING_AUTO,
  SPACING,
  LegacyStyledText,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
  StyledText,
} from '@opentrons/components'

import { ExternalLink } from '/app/atoms/Link/ExternalLink'
import { TertiaryButton } from '/app/atoms/buttons'
import { getRobotUpdateDisplayInfo } from '/app/redux/robot-update'
import { useDispatchStartRobotUpdate } from '/app/redux/robot-update/hooks'
import { remote } from '/app/redux/shell/remote'

import type { ChangeEventHandler, MouseEventHandler } from 'react'
import type { State } from '/app/redux/types'

const OT_APP_UPDATE_PAGE_LINK = 'https://opentrons.com/ot-app/'
const HIDDEN_CSS = css`
  position: fixed;
  clip: rect(1px 1px 1px 1px);
`

interface UpdateRobotSoftwareProps {
  robotName: string
  onUpdateStart: () => void
  isRobotBusy: boolean
}

export function UpdateRobotSoftware({
  robotName,
  onUpdateStart,
  isRobotBusy,
}: UpdateRobotSoftwareProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'branded'])
  const { updateFromFileDisabledReason } = useSelector((state: State) => {
    return getRobotUpdateDisplayInfo(state, robotName)
  })
  const updateDisabled = updateFromFileDisabledReason !== null
  const [updateButtonProps, updateButtonTooltipProps] = useHoverTooltip()
  const inputRef = useRef<HTMLInputElement>(null)
  const dispatchStartRobotUpdate = useDispatchStartRobotUpdate()

  const handleChange: ChangeEventHandler<HTMLInputElement> = event => {
    const { files } = event.target

    if (files != null) {
      void remote.getFilePathFrom(files[0]).then(filePath => {
        if (files.length === 1 && !updateDisabled) {
          dispatchStartRobotUpdate(robotName, filePath)
          onUpdateStart()
        }
        // this is to reset the state of the file picker so users can reselect the same
        // system image if the upload fails
        if (inputRef.current?.value != null) {
          inputRef.current.value = ''
        }
      })
    }
  }

  const handleClick: MouseEventHandler<HTMLButtonElement> = () => {
    inputRef.current?.click()
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
      <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Box width="70%">
          <LegacyStyledText
            css={TYPOGRAPHY.pSemiBold}
            marginBottom={SPACING.spacing8}
            id="AdvancedSettings_updateRobotSoftware"
          >
            {t('update_robot_software')}
          </LegacyStyledText>
          <LegacyStyledText as="p" marginBottom={SPACING.spacing8}>
            {t('branded:update_robot_software_description')}
          </LegacyStyledText>
          <ExternalLink href={OT_APP_UPDATE_PAGE_LINK}>
            {t('branded:update_robot_software_link')}
          </ExternalLink>
        </Box>
        <TertiaryButton
          marginLeft={SPACING_AUTO}
          id="AdvancedSettings_softwareUpdateButton"
          {...updateButtonProps}
          disabled={updateDisabled || isRobotBusy}
          onClick={handleClick}
        >
          {t('browse_file_system')}
          <input
            ref={inputRef}
            type="file"
            onChange={handleChange}
            disabled={updateDisabled}
            css={HIDDEN_CSS}
          />
        </TertiaryButton>
        {updateFromFileDisabledReason != null && (
          <Tooltip tooltipProps={updateButtonTooltipProps}>
            {t(updateFromFileDisabledReason)}
          </Tooltip>
        )}
      </Flex>
      <Banner type="warning">
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('you_should_not_downgrade')}
        </StyledText>
      </Banner>
    </Flex>
  )
}
