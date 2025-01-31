import { moveToMaintenancePosition } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/commands'

import type { CommandData } from '@opentrons/api-client'
import type { LoadedPipette } from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/types'

export interface UseHandleValidMoveToMaintenancePositionResult {
  /* Only move to maintenance position during probe steps. */
  handleValidMoveToMaintenancePosition: (
    pipette: LoadedPipette | null
  ) => Promise<CommandData[]>
}

export function useHandleValidMoveToMaintenancePosition({
  chainLPCCommands,
}: UseLPCCommandWithChainRunChildProps): UseHandleValidMoveToMaintenancePositionResult {
  return {
    handleValidMoveToMaintenancePosition: (
      pipette: LoadedPipette | null
    ): Promise<CommandData[]> => {
      return chainLPCCommands(moveToMaintenancePosition(pipette), false)
    },
  }
}
