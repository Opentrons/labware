import { useCallback, useEffect, useState } from 'react'

import { useCreateMaintenanceCommandMutation } from '@opentrons/react-api-client'

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

// TODO(jh, 01-06-25): This debounced jog logic is used elsewhere in the app, ex, Drop tip wizard. We should consolidate it.
export function useHandleJog({
  maintenanceRunId,
  step: currentStep,
  setErrorMessage,
}: UseHandleJogProps): UseHandleJogResult {
  const [isJogging, setIsJogging] = useState(false)
  const [jogQueue, setJogQueue] = useState<Array<() => Promise<void>>>([])
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
      return new Promise<void>(() => {
        const pipetteId =
          'pipetteId' in currentStep ? currentStep.pipetteId : null

        if (pipetteId != null) {
          createSilentCommand({
            maintenanceRunId,
            command: {
              commandType: 'moveRelative',
              params: { pipetteId, distance: step * dir, axis },
            },
            waitUntilComplete: true,
            timeout: JOG_COMMAND_TIMEOUT_MS,
          })
            .then(data => {
              onSuccess?.(
                (data?.data?.result?.position ?? null) as Coordinates | null
              )
            })
            .catch((e: Error) => {
              setErrorMessage(`Error issuing jog command: ${e.message}`)
            })
        } else {
          setErrorMessage(
            `Could not find pipette to jog with id: ${pipetteId ?? ''}`
          )
        }
      })
    },
    [currentStep, maintenanceRunId]
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
