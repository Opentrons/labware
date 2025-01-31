import { RECOVERY_MAP } from '../constants'
import {
  GripperIsHoldingLabware,
  GripperReleaseLabware,
  SkipStepInfo,
  TwoColLwInfoAndDeck,
  RecoveryDoorOpenSpecial,
} from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function ManualMoveLwAndSkip(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { MANUAL_MOVE_AND_SKIP } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case MANUAL_MOVE_AND_SKIP.STEPS.GRIPPER_HOLDING_LABWARE:
        return <GripperIsHoldingLabware {...props} />
      case MANUAL_MOVE_AND_SKIP.STEPS.GRIPPER_RELEASE_LABWARE:
        return <GripperReleaseLabware {...props} />
      case MANUAL_MOVE_AND_SKIP.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME:
        return <RecoveryDoorOpenSpecial {...props} />
      case MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE:
        return <TwoColLwInfoAndDeck {...props} />
      case MANUAL_MOVE_AND_SKIP.STEPS.SKIP:
        return <SkipStepInfo {...props} />
      default:
        console.warn(
          `ManualMoveLwAndSkipStep: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}
