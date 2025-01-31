import { RECOVERY_MAP } from '../constants'
import { RetryStepInfo } from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function RetryStep(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { RETRY_STEP } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case RETRY_STEP.STEPS.CONFIRM_RETRY:
        return <RetryStepInfo {...props} />
      default:
        console.warn(
          `RetryStep: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}
