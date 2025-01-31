import { format } from 'date-fns'

import type { Dispatch, SetStateAction } from 'react'
import type { UseMutateAsyncFunction } from 'react-query'
import type { CommandData } from '@opentrons/api-client'
import type { CreateCommand } from '@opentrons/shared-data'
import type { CreateLiveCommandMutateParams } from '@opentrons/react-api-client/src/runs/useCreateLiveCommandMutation'
import type { CreateMaintenanceCommand, CreateRunCommand } from './hooks'

export const chainRunCommandsRecursive = (
  commands: CreateCommand[],
  createRunCommand: CreateRunCommand,
  continuePastCommandFailure: boolean = true,
  setIsLoading: Dispatch<SetStateAction<boolean>>
): Promise<CommandData[]> => {
  if (commands.length < 1) {
    return Promise.reject(new Error('no commands to execute'))
  }
  setIsLoading(true)

  return createRunCommand({
    command: commands[0],
    waitUntilComplete: true,
  })
    .then(response => {
      if (!continuePastCommandFailure && response.data.status === 'failed') {
        setIsLoading(false)
        return Promise.reject(
          new Error(response.data.error?.detail ?? 'command failed')
        )
      }
      if (commands.slice(1).length < 1) {
        setIsLoading(false)
        return Promise.resolve([response])
      } else {
        return chainRunCommandsRecursive(
          commands.slice(1),
          createRunCommand,
          continuePastCommandFailure,
          setIsLoading
        ).then(deeperResponses => {
          return [response, ...deeperResponses]
        })
      }
    })
    .catch(error => {
      setIsLoading(false)
      return Promise.reject(error)
    })
}

export const chainLiveCommandsRecursive = (
  commands: CreateCommand[],
  createLiveCommand: UseMutateAsyncFunction<
    CommandData,
    unknown,
    CreateLiveCommandMutateParams
  >,
  continuePastCommandFailure: boolean = true,
  setIsLoading: Dispatch<SetStateAction<boolean>>
): Promise<CommandData[]> => {
  if (commands.length < 1) {
    return Promise.reject(new Error('no commands to execute'))
  }
  setIsLoading(true)

  return createLiveCommand({
    command: commands[0],
    waitUntilComplete: true,
  })
    .then(response => {
      if (!continuePastCommandFailure && response.data.status === 'failed') {
        setIsLoading(false)
        return Promise.reject(
          new Error(response.data.error?.detail ?? 'command failed')
        )
      }
      if (commands.slice(1).length < 1) {
        setIsLoading(false)
        return Promise.resolve([response])
      } else {
        return chainLiveCommandsRecursive(
          commands.slice(1),
          createLiveCommand,
          continuePastCommandFailure,
          setIsLoading
        ).then(deeperResponses => {
          return [response, ...deeperResponses]
        })
      }
    })
    .catch(error => {
      setIsLoading(false)
      return Promise.reject(error)
    })
}

export const chainMaintenanceCommandsRecursive = (
  maintenanceRunId: string,
  commands: CreateCommand[],
  createMaintenanceCommand: CreateMaintenanceCommand,
  continuePastCommandFailure: boolean = true,
  setIsLoading: Dispatch<SetStateAction<boolean>>
): Promise<CommandData[]> => {
  if (commands.length < 1) {
    return Promise.reject(new Error('no commands to execute'))
  }
  setIsLoading(true)

  return createMaintenanceCommand({
    maintenanceRunId: maintenanceRunId,
    command: commands[0],
    waitUntilComplete: true,
  })
    .then(response => {
      if (!continuePastCommandFailure && response.data.status === 'failed') {
        setIsLoading(false)
        return Promise.reject(
          new Error(response.data.error?.detail ?? 'command failed')
        )
      }
      if (commands.slice(1).length < 1) {
        setIsLoading(false)
        return Promise.resolve([response])
      } else {
        return chainMaintenanceCommandsRecursive(
          maintenanceRunId,
          commands.slice(1),
          createMaintenanceCommand,
          continuePastCommandFailure,
          setIsLoading
        ).then(deeperResponses => {
          return [response, ...deeperResponses]
        })
      }
    })
    .catch(error => {
      setIsLoading(false)
      return Promise.reject(error)
    })
}

const dateIsValid = (date: string): boolean => {
  return !isNaN(new Date(date).getTime())
}

export const formatTimeWithUtcLabel = (time: string | null): string => {
  const UTC_LABEL = 'UTC'
  if (time == null) return 'unknown'
  return typeof time === 'string' && dateIsValid(time)
    ? `${format(new Date(time), 'M/d/yy HH:mm')} ${UTC_LABEL}`
    : `${time} ${UTC_LABEL}`
}

// Visit the command, setting the command intent to "fixit" if a failedCommandId is supplied.
export const setCommandIntent = (
  command: CreateCommand,
  failedCommandId?: string
): CreateCommand => {
  const isCommandWithFixitIntent = failedCommandId != null
  if (isCommandWithFixitIntent) {
    return {
      ...command,
      intent: 'fixit',
    }
  }
  return command
}
