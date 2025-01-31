import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Btn,
  DIRECTION_COLUMN,
  Flex,
  Banner,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getRobotUpdateDisplayInfo } from '/app/redux/robot-update'
import { handleUpdateBuildroot } from '../Devices/RobotSettings/UpdateBuildroot'

import type { MouseEvent } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { State } from '/app/redux/types'
import type { DiscoveredRobot } from '/app/redux/discovery/types'

interface UpdateRobotBannerProps extends StyleProps {
  robot: DiscoveredRobot
}

export function UpdateRobotBanner(
  props: UpdateRobotBannerProps
): JSX.Element | null {
  const { robot, ...styleProps } = props
  const { t } = useTranslation(['device_settings', 'branded'])

  const { autoUpdateAction } = useSelector((state: State) => {
    return getRobotUpdateDisplayInfo(state, robot?.name)
  })

  return (autoUpdateAction === 'upgrade' || autoUpdateAction === 'downgrade') &&
    robot !== null &&
    robot.healthStatus === 'ok' ? (
    <Flex
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
      }}
      flexDirection={DIRECTION_COLUMN}
    >
      <Banner type="error" {...styleProps} iconMarginLeft={SPACING.spacing4}>
        <LegacyStyledText as="p" marginRight={SPACING.spacing4}>
          {t('branded:robot_software_update_required')}
        </LegacyStyledText>
        <Btn
          onClick={() => {
            handleUpdateBuildroot(robot)
          }}
          css={TYPOGRAPHY.pRegular}
          textDecoration={TYPOGRAPHY.textDecorationUnderline}
        >
          {t('view_update')}
        </Btn>
      </Banner>
    </Flex>
  ) : null
}
