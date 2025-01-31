import { RECOVERY_MAP } from '../constants'
import {
  GripperIsHoldingLabware,
  GripperReleaseLabware,
  TwoColLwInfoAndDeck,
  RetryStepInfo,
  RecoveryDoorOpenSpecial,
} from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function ManualReplaceLwAndRetry(
  props: RecoveryContentProps
): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { MANUAL_REPLACE_AND_RETRY } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case MANUAL_REPLACE_AND_RETRY.STEPS.GRIPPER_HOLDING_LABWARE:
        return <GripperIsHoldingLabware {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.GRIPPER_RELEASE_LABWARE:
        return <GripperReleaseLabware {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME:
        return <RecoveryDoorOpenSpecial {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE:
        return <TwoColLwInfoAndDeck {...props} />
      case MANUAL_REPLACE_AND_RETRY.STEPS.RETRY:
        return <RetryStepInfo {...props} />
      default:
        console.warn(
          `ManualReplaceLwAndRetry: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}
