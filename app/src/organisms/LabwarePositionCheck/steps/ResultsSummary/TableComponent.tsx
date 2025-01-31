import { useSelector } from 'react-redux'

import { TerseOffsetTable } from '/app/organisms/TerseOffsetTable'
import { OffsetTable } from './OffsetTable'
import { getIsOnDevice } from '/app/redux/config'

import type { LegacyLabwareOffsetCreateData } from '@opentrons/api-client'
import type {
  LPCStepProps,
  ResultsSummaryStep,
} from '/app/organisms/LabwarePositionCheck/types'
import type { State } from '/app/redux/types'
import type { LPCWizardState } from '/app/redux/protocol-runs'

interface TableComponentProps extends LPCStepProps<ResultsSummaryStep> {
  offsetsToApply: LegacyLabwareOffsetCreateData[]
}

export function TableComponent(props: TableComponentProps): JSX.Element {
  const { offsetsToApply, runId } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { labwareDefs } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )

  return isOnDevice ? (
    <TerseOffsetTable
      offsets={offsetsToApply}
      labwareDefinitions={labwareDefs}
    />
  ) : (
    <OffsetTable
      offsets={offsetsToApply}
      labwareDefinitions={labwareDefs}
      {...props}
    />
  )
}
