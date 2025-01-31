import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useRobot } from '/app/redux-resources/robots'
import { getRobotSerialNumber } from '/app/redux/discovery'
import { SecondaryButton } from '@opentrons/components'

import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
} from '/app/redux/analytics'

import type { RefObject } from 'react'

interface BackToTopButtonProps {
  protocolRunHeaderRef: RefObject<HTMLDivElement> | null
  robotName: string
  runId: string
  sourceLocation: string
}

export function BackToTopButton({
  protocolRunHeaderRef,
  robotName,
  runId,
  sourceLocation,
}: BackToTopButtonProps): JSX.Element | null {
  const { t } = useTranslation('protocol_setup')
  const trackEvent = useTrackEvent()
  const robot = useRobot(robotName)
  const robotSerialNumber =
    robot?.status != null ? getRobotSerialNumber(robot) : null
  return (
    <Link
      to={`/devices/${robotName}/protocol-runs/${runId}/setup`}
      onClick={() => {
        trackEvent({
          name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
          properties: { sourceLocation, robotSerialNumber },
        })
        protocolRunHeaderRef?.current?.scrollIntoView({
          behavior: 'smooth',
        })
      }}
    >
      <SecondaryButton id="LabwareSetup_proceedToRunButton">
        {t('back_to_top')}
      </SecondaryButton>
    </Link>
  )
}
