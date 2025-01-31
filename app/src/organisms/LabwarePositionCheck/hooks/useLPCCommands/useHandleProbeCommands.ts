import { useState } from 'react'

import {
  retractPipetteAxesSequentiallyCommands,
  verifyProbeAttachmentAndHomeCommands,
} from './commands'

import type { CreateCommand, LoadedPipette } from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from './types'

export interface UseProbeCommandsResult {
  handleProbeAttachment: (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ) => Promise<void>
  handleProbeDetachment: (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ) => Promise<void>
  unableToDetect: boolean
  setShowUnableToDetect: (canDetect: boolean) => void
}

export function useHandleProbeCommands({
  chainLPCCommands,
}: UseLPCCommandWithChainRunChildProps): UseProbeCommandsResult {
  const [showUnableToDetect, setShowUnableToDetect] = useState<boolean>(false)

  const handleProbeAttachment = (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ): Promise<void> => {
    const attachmentCommands: CreateCommand[] = [
      ...verifyProbeAttachmentAndHomeCommands(pipette),
    ]

    return chainLPCCommands(attachmentCommands, false, true)
      .catch(() => {
        setShowUnableToDetect(true)
        return Promise.reject(new Error('Unable to detect probe.'))
      })
      .then(() => {
        setShowUnableToDetect(false)
        onSuccess()
      })
  }

  const handleProbeDetachment = (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ): Promise<void> => {
    const detatchmentCommands: CreateCommand[] = [
      ...retractPipetteAxesSequentiallyCommands(pipette),
    ]

    return chainLPCCommands(detatchmentCommands, false).then(() => {
      onSuccess()
    })
  }

  return {
    handleProbeAttachment,
    unableToDetect: showUnableToDetect,
    setShowUnableToDetect,
    handleProbeDetachment,
  }
}
