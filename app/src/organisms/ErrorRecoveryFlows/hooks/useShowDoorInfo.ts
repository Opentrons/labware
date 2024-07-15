import * as React from 'react'

import {
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
} from '@opentrons/api-client'

import type { ErrorRecoveryFlowsProps } from '../index'

interface UseDoorOpenParams {
  runStatus: ErrorRecoveryFlowsProps['runStatus']
  showERWizard: boolean
  hasLaunchedRecovery: boolean
}
// Whether the door is open or the user has not yet resumed the run after a door open event.
export function useShowDoorInfo({
  runStatus,
  showERWizard,
  hasLaunchedRecovery,
}: UseDoorOpenParams): boolean {
  const [showDoorInfo, setShowDoorInfo] = React.useState(false)
  // Handle recovery door status changes.
  React.useEffect(() => {
    if (runStatus === RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR) {
      setShowDoorInfo(true)
    } else if (
      showDoorInfo &&
      runStatus !== RUN_STATUS_AWAITING_RECOVERY_PAUSED
    ) {
      setShowDoorInfo(false)
    }
  }, [hasLaunchedRecovery, runStatus, showDoorInfo, showERWizard])

  return showDoorInfo
}
