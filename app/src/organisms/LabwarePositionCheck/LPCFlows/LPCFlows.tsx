import { LPCWizardContainer } from '/app/organisms/LabwarePositionCheck/LPCWizardContainer'

import type {
  RobotType,
  CompletedProtocolAnalysis,
  DeckConfiguration,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { LabwareOffset } from '@opentrons/api-client'
import type { LPCLabwareInfo } from '/app/redux/protocol-runs'

// Inject the props specific to the legacy LPC flows, too.
export interface LegacySupportLPCFlowsProps extends LPCFlowsProps {
  existingOffsets: LabwareOffset[]
}

export interface LPCFlowsProps {
  onCloseClick: () => void
  runId: string
  robotType: RobotType
  deckConfig: DeckConfiguration
  labwareDefs: LabwareDefinition2[]
  labwareInfo: LPCLabwareInfo
  mostRecentAnalysis: CompletedProtocolAnalysis
  protocolName: string
  maintenanceRunId: string
}

export function LPCFlows(props: LegacySupportLPCFlowsProps): JSX.Element {
  return <LPCWizardContainer {...props} />
}
