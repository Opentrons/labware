import { useStore } from 'react-redux'

import { selectOffsetsToApply } from '/app/redux/protocol-runs'

import type { State } from '/app/redux/types'
import type { LegacyLabwareOffsetCreateData } from '@opentrons/api-client'
import type { UseLPCCommandChildProps } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/types'

export interface UseBuildOffsetsToApplyResult {
  buildOffsetsToApply: () => LegacyLabwareOffsetCreateData[]
}

export interface UseApplyLPCOffsetsProps extends UseLPCCommandChildProps {
  setErrorMessage: (msg: string | null) => void
}

export function useBuildOffsetsToApply({
  runId,
  setErrorMessage,
}: UseApplyLPCOffsetsProps): UseBuildOffsetsToApplyResult {
  // Utilizing useStore instead of useSelector enables error handling within the selector
  // but only invoke the selector when it's actually needed.
  const store = useStore<State>()

  return {
    buildOffsetsToApply: () => {
      try {
        const selectOffsets = selectOffsetsToApply(runId)
        const offsetsToApply = selectOffsets(store.getState())
        return offsetsToApply
      } catch (e) {
        if (e instanceof Error) {
          setErrorMessage(e.message)
        } else {
          setErrorMessage('Failed to create finalized labware offsets.')
        }
        return []
      }
    },
  }
}
