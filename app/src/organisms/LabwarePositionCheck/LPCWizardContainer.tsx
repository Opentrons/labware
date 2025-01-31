import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { LPCWizardFlex } from './LPCWizardFlex'
import { LegacyLabwarePositionCheck } from '/app/organisms/LegacyLabwarePositionCheck'

import type { LegacySupportLPCFlowsProps } from '/app/organisms/LabwarePositionCheck/LPCFlows'

export function LPCWizardContainer(
  props: LegacySupportLPCFlowsProps
): JSX.Element {
  switch (props.robotType) {
    case FLEX_ROBOT_TYPE:
      return <LPCWizardFlex {...props} />
    case OT2_ROBOT_TYPE:
      return <LegacyLabwarePositionCheck {...props} />
    default: {
      console.error('Unhandled robot type in LPC.')
      return <></>
    }
  }
}
