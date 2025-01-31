import {
  moduleCleanupDuringLPCCommands,
  moveLabwareOffDeckCommands,
  retractPipetteAxesSequentiallyCommands,
  savePositionCommands,
} from './commands'

import type {
  LoadedPipette,
  Coordinates,
  CreateCommand,
} from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from './types'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

interface UseHandleConfirmPositionProps
  extends UseLPCCommandWithChainRunChildProps {
  setErrorMessage: (msg: string | null) => void
}

export interface UseHandleConfirmPositionResult {
  /* Initiate commands to return specific modules to a post-run condition before
   * non-plunger homing the utilized pipette and saving the LPC position. */
  handleConfirmLwFinalPosition: (
    offsetLocationDetails: OffsetLocationDetails,
    pipette: LoadedPipette
  ) => Promise<Coordinates | null>
}

export function useHandleConfirmLwFinalPosition({
  setErrorMessage,
  chainLPCCommands,
}: UseHandleConfirmPositionProps): UseHandleConfirmPositionResult {
  const handleConfirmLwFinalPosition = (
    offsetLocationDetails: OffsetLocationDetails,
    pipette: LoadedPipette
  ): Promise<Coordinates | null> => {
    const confirmCommands: CreateCommand[] = [
      ...savePositionCommands(pipette.id),
      ...retractPipetteAxesSequentiallyCommands(pipette),
      ...moduleCleanupDuringLPCCommands(offsetLocationDetails),
      ...moveLabwareOffDeckCommands(offsetLocationDetails),
    ]

    return chainLPCCommands(confirmCommands, false).then(responses => {
      const firstResponse = responses[0]
      if (firstResponse.data.commandType === 'savePosition') {
        const { position } = firstResponse.data?.result ?? { position: null }

        return Promise.resolve(position)
      } else {
        setErrorMessage('CheckItem failed to save final position with message')
        return Promise.reject(
          new Error('CheckItem failed to save final position with message')
        )
      }
    })
  }

  return { handleConfirmLwFinalPosition }
}
