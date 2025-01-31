import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
} from '@opentrons/components'
import { useRobotSettingsQuery } from '@opentrons/react-api-client'
import { getIsShellReady } from '/app/redux/shell'

import type { ReactNode } from 'react'

export function InitialLoadingScreen({
  children,
}: {
  children?: ReactNode
}): JSX.Element {
  const isShellReady = useSelector(getIsShellReady)

  // ensure robot-server api is up and settings query data available for localization provider
  const { settings } =
    useRobotSettingsQuery({ retry: true, retryDelay: 1000 }).data ?? {}

  return isShellReady && settings != null ? (
    <>{children}</>
  ) : (
    <Flex
      backgroundColor={COLORS.grey35}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing40}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      width="100%"
      height="100%"
    >
      <Icon
        name="ot-spinner"
        size="160px"
        spin
        color={COLORS.grey60}
        aria-label="loading indicator"
      />
    </Flex>
  )
}
