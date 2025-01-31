import {
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_STOPPED,
} from '@opentrons/api-client'

import { isCancellableStatus } from '../utils'

import type { RunHeaderBannerContainerProps } from '.'

interface ShowGenericRunHeaderBannersParams {
  runStatus: RunHeaderBannerContainerProps['runStatus']
  enteredER: RunHeaderBannerContainerProps['enteredER']
  isDoorOpen: boolean
}

interface ShowGenericRunHeaderBannersResult {
  showRunCanceledBanner: boolean
  showDoorOpenDuringRunBanner: boolean
  showDoorOpenBeforeRunBanner: boolean
}

// Returns the "should render" scalar for all the generic Banner components used by ProtocolRunHeader.
export function getShowGenericRunHeaderBanners({
  runStatus,
  isDoorOpen,
  enteredER,
}: ShowGenericRunHeaderBannersParams): ShowGenericRunHeaderBannersResult {
  const showRunCanceledBanner = runStatus === RUN_STATUS_STOPPED && !enteredER

  const showDoorOpenBeforeRunBanner =
    isDoorOpen &&
    isCancellableStatus(runStatus) &&
    runStatus !== RUN_STATUS_BLOCKED_BY_OPEN_DOOR &&
    runStatus !== RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR &&
    runStatus !== RUN_STATUS_AWAITING_RECOVERY_PAUSED

  const showDoorOpenDuringRunBanner =
    runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR

  return {
    showRunCanceledBanner,
    showDoorOpenBeforeRunBanner,
    showDoorOpenDuringRunBanner,
  }
}
