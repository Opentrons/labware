import {
  fullHomeCommands,
  moduleInitBeforeAnyLPCCommands,
  moveToMaintenancePosition,
} from './commands'

import type {
  CompletedProtocolAnalysis,
  CreateCommand,
  RunTimeCommand,
  SetupRunTimeCommand,
  LoadedPipette,
} from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from './types'

export interface UseHandleStartLPCResult {
  handleStartLPC: (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ) => Promise<void>
}

export function useHandleStartLPC({
  chainLPCCommands,
  mostRecentAnalysis,
}: UseLPCCommandWithChainRunChildProps): UseHandleStartLPCResult {
  const handleStartLPC = (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ): Promise<void> => {
    const startCommands: CreateCommand[] = [
      ...buildInstrumentLabwarePrepCommands(mostRecentAnalysis),
      ...moduleInitBeforeAnyLPCCommands(mostRecentAnalysis),
      ...fullHomeCommands(),
      ...moveToMaintenancePosition(pipette),
    ]

    return chainLPCCommands(startCommands, false).then(() => {
      onSuccess()
    })
  }

  return { handleStartLPC }
}

// Load all pipettes and labware into the maintenance run by utilizing the protocol resource.
// Labware is loaded off-deck so that LPC can move them on individually later.
// Next, emit module-specific setup commands to prepare for LPC.
function buildInstrumentLabwarePrepCommands(
  protocolData: CompletedProtocolAnalysis
): SetupRunTimeCommand[] {
  return (
    protocolData.commands
      .filter(isLoadCommand)
      .reduce<SetupRunTimeCommand[]>((acc, command) => {
        if (
          command.commandType === 'loadPipette' &&
          command.result?.pipetteId != null
        ) {
          const { pipetteId } = command.result
          const loadWithPipetteId = {
            ...command,
            params: {
              ...command.params,
              pipetteId,
            },
          }
          return [...acc, loadWithPipetteId]
        } else if (
          command.commandType === 'loadLabware' &&
          command.result?.labwareId != null
        ) {
          return [
            ...acc,
            {
              ...command,
              params: {
                ...command.params,
                location: 'offDeck',
                // python protocols won't have labwareId in the params, we want to
                // use the same labwareIds that came back as the result of analysis
                labwareId: command.result.labwareId,
              },
            },
          ]
        } else if (
          command.commandType === 'loadModule' &&
          command.result?.moduleId != null
        ) {
          return [
            ...acc,
            {
              ...command,
              params: {
                ...command.params,
                // python protocols won't have moduleId in the params, we want to
                // use the same moduleIds that came back as the result of analysis
                moduleId: command.result.moduleId,
              },
            },
          ]
        }
        return [...acc, command]
      }, []) ?? []
  )
}

function isLoadCommand(
  command: RunTimeCommand
): command is SetupRunTimeCommand {
  const loadCommands: Array<CreateCommand['commandType']> = [
    'loadLabware',
    'loadModule',
    'loadPipette',
  ]
  return loadCommands.includes(command.commandType)
}
