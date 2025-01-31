import { modulePrepCommands } from './commands'

import type { CommandData, VectorOffset } from '@opentrons/api-client'
import type { CreateCommand } from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from './types'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

export interface UseHandlePrepModulesResult {
  handleCheckItemsPrepModules: (
    offsetLocationDetails: OffsetLocationDetails,
    initialPosition: VectorOffset | null
  ) => Promise<CommandData[]>
}

// Prep module(s) before LPCing a specific labware involving module(s).
export function useHandlePrepModules({
  chainLPCCommands,
}: UseLPCCommandWithChainRunChildProps): UseHandlePrepModulesResult {
  const handleCheckItemsPrepModules = (
    offsetLocationDetails: OffsetLocationDetails,
    initialPosition: VectorOffset | null
  ): Promise<CommandData[]> => {
    const prepCommands: CreateCommand[] = modulePrepCommands(
      offsetLocationDetails
    )

    if (initialPosition == null && prepCommands.length > 0) {
      return chainLPCCommands(prepCommands, false)
    } else {
      return Promise.resolve([])
    }
  }

  return { handleCheckItemsPrepModules }
}
