import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import { useCreateMaintenanceCommandMutation } from '@opentrons/react-api-client'

import { moveRelativeCommand } from './commands'
import { selectActivePipette } from '/app/redux/protocol-runs'

import type { Coordinates } from '@opentrons/shared-data'
import type {
  Axis,
  Jog,
  Sign,
  StepSize,
} from '/app/molecules/JogControls/types'
import type { UseLPCCommandChildProps } from './types'

const JOG_COMMAND_TIMEOUT_MS = 10000
const MAX_QUEUED_JOGS = 3

interface UseHandleJogProps extends UseLPCCommandChildProps {
  setErrorMessage: (msg: string | null) => void
}

export interface UseHandleJogResult {
  handleJog: Jog
}

// TODO(jh, 01-21-25): Extract the throttling logic into its own hook that lives elsewhere and is used by other Jog flows.

export function useHandleJog({
  runId,
  maintenanceRunId,
  setErrorMessage,
}: UseHandleJogProps): UseHandleJogResult {
  const [isJogging, setIsJogging] = useState(false)
  const [jogQueue, setJogQueue] = useState<Array<() => Promise<void>>>([])
  const pipette = useSelector(selectActivePipette(runId))
  const pipetteId = pipette?.id
  const {
    createMaintenanceCommand: createSilentCommand,
  } = useCreateMaintenanceCommandMutation()

  const executeJog = useCallback(
    (
      axis: Axis,
      dir: Sign,
      step: StepSize,
      onSuccess?: (position: Coordinates | null) => void
    ): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (pipetteId != null) {
          createSilentCommand({
            maintenanceRunId,
            command: moveRelativeCommand({ pipetteId, axis, dir, step }),
            waitUntilComplete: true,
            timeout: JOG_COMMAND_TIMEOUT_MS,
          })
            .then(data => {
              onSuccess?.(
                (data?.data?.result?.position ?? null) as Coordinates | null
              )
              resolve()
            })
            .catch((e: Error) => {
              setErrorMessage(`Error issuing jog command: ${e.message}`)
              reject(e)
            })
        } else {
          const error = new Error(
            `Could not find pipette to jog with id: ${pipetteId ?? ''}`
          )
          setErrorMessage(error.message)
          reject(error)
        }
      })
    },
    [pipetteId, maintenanceRunId, createSilentCommand, setErrorMessage]
  )

  const processJogQueue = useCallback((): void => {
    if (jogQueue.length > 0 && !isJogging) {
      setIsJogging(true)
      const nextJog = jogQueue[0]
      setJogQueue(prevQueue => prevQueue.slice(1))
      void nextJog().finally(() => {
        setIsJogging(false)
      })
    }
  }, [jogQueue, isJogging])

  useEffect(() => {
    processJogQueue()
  }, [processJogQueue, jogQueue.length, isJogging])

  const handleJog = useCallback(
    (
      axis: Axis,
      dir: Sign,
      step: StepSize,
      onSuccess?: (position: Coordinates | null) => void
    ): void => {
      setJogQueue(prevQueue => {
        if (prevQueue.length < MAX_QUEUED_JOGS) {
          return [...prevQueue, () => executeJog(axis, dir, step, onSuccess)]
        }
        return prevQueue
      })
    },
    [executeJog]
  )

  return { handleJog }
}
