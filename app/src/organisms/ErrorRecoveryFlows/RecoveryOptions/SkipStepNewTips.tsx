import { RECOVERY_MAP } from '../constants'
import { TwoColLwInfoAndDeck, SelectTips, SkipStepInfo } from '../shared'
import { SelectRecoveryOption } from './SelectRecoveryOption'

import type { RecoveryContentProps } from '../types'

export function SkipStepNewTips(
  props: RecoveryContentProps
): JSX.Element | null {
  const { recoveryMap, routeUpdateActions } = props
  const { step, route } = recoveryMap
  const { SKIP_STEP_WITH_NEW_TIPS, DROP_TIP_FLOWS } = RECOVERY_MAP

  // Do this instead of directly routing to DropTipFlows route first,
  // so SelectRecoveryOptions labels this route as the selected recovery option.
  if (step === SKIP_STEP_WITH_NEW_TIPS.STEPS.DROP_TIPS) {
    void routeUpdateActions.proceedToRouteAndStep(
      DROP_TIP_FLOWS.ROUTE,
      DROP_TIP_FLOWS.STEPS.BEFORE_BEGINNING
    )
  }

  const buildContent = (): JSX.Element => {
    switch (step) {
      case SKIP_STEP_WITH_NEW_TIPS.STEPS.REPLACE_TIPS:
        return <TwoColLwInfoAndDeck {...props} />
      case SKIP_STEP_WITH_NEW_TIPS.STEPS.SELECT_TIPS:
        return <SelectTips {...props} />
      case SKIP_STEP_WITH_NEW_TIPS.STEPS.SKIP:
        return <SkipStepInfo {...props} />
      default:
        console.warn(
          `SkipStepNewTips: ${step} in ${route} not explicitly handled. Rerouting.`
        )
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}
