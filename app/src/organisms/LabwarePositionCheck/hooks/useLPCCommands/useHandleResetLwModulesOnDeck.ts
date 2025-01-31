import {
  fullHomeCommands,
  modulePrepCommands,
  moveLabwareOffDeckCommands,
} from './commands'

import type { CreateCommand } from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from './types'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

export interface UseHandleResetLwModulesOnDeckResult {
  handleResetLwModulesOnDeck: (
    offsetLocationDetails: OffsetLocationDetails
  ) => Promise<void>
}

export function useHandleResetLwModulesOnDeck({
  chainLPCCommands,
}: UseLPCCommandWithChainRunChildProps): UseHandleResetLwModulesOnDeckResult {
  const handleResetLwModulesOnDeck = (
    offsetLocationDetails: OffsetLocationDetails
  ): Promise<void> => {
    const resetCommands: CreateCommand[] = [
      ...modulePrepCommands(offsetLocationDetails),
      ...fullHomeCommands(),
      ...moveLabwareOffDeckCommands(offsetLocationDetails),
    ]

    return chainLPCCommands(resetCommands, false).then(() => Promise.resolve())
  }

  return { handleResetLwModulesOnDeck }
}
