import {
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  ABSORBANCE_READER_TYPE,
} from '@opentrons/shared-data'

import type {
  CompletedProtocolAnalysis,
  CreateCommand,
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerDeactivateShakerCreateCommand,
  HomeCreateCommand,
  RunTimeCommand,
  SetupRunTimeCommand,
  TCOpenLidCreateCommand,
  AbsorbanceReaderOpenLidCreateCommand,
} from '@opentrons/shared-data'

type LPCPrepCommand =
  | HomeCreateCommand
  | SetupRunTimeCommand
  | TCOpenLidCreateCommand
  | HeaterShakerDeactivateShakerCreateCommand
  | HeaterShakerCloseLatchCreateCommand
  | AbsorbanceReaderOpenLidCreateCommand

export function getPrepCommands(
  protocolData: CompletedProtocolAnalysis
): LPCPrepCommand[] {
  // load commands come from the protocol resource
  const loadCommands: LPCPrepCommand[] =
    protocolData.commands
      .filter(isLoadCommand)
      .reduce<LPCPrepCommand[]>((acc, command) => {
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
          // load all labware off-deck so that LPC can move them on individually later
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

  const TCCommands = protocolData.modules.reduce<TCOpenLidCreateCommand[]>(
    (acc, module) => {
      if (getModuleType(module.model) === THERMOCYCLER_MODULE_TYPE) {
        return [
          ...acc,
          {
            commandType: 'thermocycler/openLid',
            params: { moduleId: module.id },
          },
        ]
      }
      return acc
    },
    []
  )

  const AbsorbanceCommands = protocolData.modules.reduce<LPCPrepCommand[]>(
    (acc, module) => {
      if (getModuleType(module.model) === ABSORBANCE_READER_TYPE) {
        return [
          ...acc,
          {
            commandType: 'home',
            params: {},
          },
          {
            commandType: 'absorbanceReader/openLid',
            params: { moduleId: module.id },
          },
        ]
      }
      return acc
    },
    []
  )

  const HSCommands = protocolData.modules.reduce<
    HeaterShakerCloseLatchCreateCommand[]
  >((acc, module) => {
    if (getModuleType(module.model) === HEATERSHAKER_MODULE_TYPE) {
      return [
        ...acc,
        {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: { moduleId: module.id },
        },
      ]
    }
    return acc
  }, [])
  const homeCommand: HomeCreateCommand = {
    commandType: 'home',
    params: {},
  }
  // prepCommands will be run when a user starts LPC
  return [
    ...loadCommands,
    ...TCCommands,
    ...AbsorbanceCommands,
    ...HSCommands,
    homeCommand,
  ]
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
