import { useState, useCallback } from 'react'
import head from 'lodash/head'

import { useHost } from '@opentrons/react-api-client'
import {
  getCommands,
  getInstruments,
  getRunCurrentState,
} from '@opentrons/api-client'
import { getPipetteModelSpecs } from '@opentrons/shared-data'

import type {
  HostConfig,
  Mount,
  PipetteData,
  Run,
  RunCommandSummary,
} from '@opentrons/api-client'
import type { PipetteModelSpecs } from '@opentrons/shared-data'

export interface PipetteWithTip {
  mount: Mount
  specs: PipetteModelSpecs
}

export interface PipetteTipState {
  specs: PipetteModelSpecs | null
  mount: Mount
  hasTip: boolean
}

export interface TipAttachmentStatusParams {
  runId: string
  runRecord: Run | null
}

export interface TipAttachmentStatusResult {
  /** Updates the pipettes with tip cache. Determine whether tips are likely attached on one or more pipettes, assuming
   * tips are attached when there's uncertainty.
   *
   * NOTE: This function makes a few network requests on each invocation!
   * */
  determineTipStatus: () => Promise<PipetteWithTip[]>
  /* Whether tips are likely attached on *any* pipette. Typically called after determineTipStatus() */
  areTipsAttached: boolean
  /* Resets the cached pipettes with tip statuses to null.  */
  resetTipStatus: () => void
  /** Removes the first element from the tip attached cache if present.
   * @param {Function} onEmptyCache After removing the pipette from the cache, if the attached tip cache is empty, invoke this callback.
   * @param {Function} onTipsDetected After removing the pipette from the cache, if the attached tip cache is not empty, invoke this callback.
   * */
  setTipStatusResolved: (
    onEmptyCache?: () => void,
    onTipsDetected?: () => void
  ) => Promise<PipetteWithTip>
  /* Relevant pipette information for a pipette with a tip attached. If both pipettes have tips attached, return the left pipette. */
  aPipetteWithTip: PipetteWithTip | null
  /* The initial number of pipettes with tips. Null if there has been no tip check yet. */
  initialPipettesWithTipsCount: number | null
}

// Returns various utilities for interacting with the cache of pipettes with tips attached.
export function useTipAttachmentStatus(
  params: TipAttachmentStatusParams
): TipAttachmentStatusResult {
  const { runId, runRecord } = params
  const host = useHost()
  const [pipettesWithTip, setPipettesWithTip] = useState<PipetteWithTip[]>([])
  const [initialPipettesCount, setInitialPipettesCount] = useState<
    number | null
  >(null)

  const aPipetteWithTip = head(pipettesWithTip) ?? null
  const areTipsAttached =
    pipettesWithTip.length > 0 && head(pipettesWithTip)?.specs != null

  const determineTipStatus = useCallback((): Promise<PipetteWithTip[]> => {
    return Promise.all([
      getInstruments(host as HostConfig),
      getRunCurrentState(host as HostConfig, runId),
      getCommands(host as HostConfig, runId, {
        includeFixitCommands: false,
        pageLength: 1,
      }),
    ])
      .then(([attachedInstruments, currentState, commandsData]) => {
        const { tipStates } = currentState.data.data

        const pipetteInfo = validatePipetteInfo(
          attachedInstruments?.data.data as PipetteData[]
        )

        const pipetteInfoById = createPipetteInfoById(runRecord, pipetteInfo)
        const pipettesWithTipsData = getPipettesWithTipsData(
          // eslint-disable-next-line
          tipStates,
          pipetteInfoById,
          commandsData.data.data as RunCommandSummary[]
        )
        const pipettesWithTipAndSpecs = filterPipettesWithTips(
          pipettesWithTipsData
        )

        setPipettesWithTip(pipettesWithTipAndSpecs)

        if (initialPipettesCount === null) {
          setInitialPipettesCount(pipettesWithTipAndSpecs.length)
        }

        return Promise.resolve(pipettesWithTipAndSpecs)
      })
      .catch(e => {
        console.error(`Error during tip status check: ${e.message}`)
        return Promise.resolve([])
      })
  }, [host, initialPipettesCount, runId, runRecord])

  const resetTipStatus = (): void => {
    setPipettesWithTip([])
    setInitialPipettesCount(null)
  }

  const setTipStatusResolved = (
    onEmptyCache?: () => void,
    onTipsDetected?: () => void
  ): Promise<PipetteWithTip> => {
    return new Promise<PipetteWithTip>(resolve => {
      setPipettesWithTip(prevPipettesWithTip => {
        const newState = [...prevPipettesWithTip.slice(1)]
        if (newState.length === 0) {
          onEmptyCache?.()
        } else {
          onTipsDetected?.()
        }

        resolve(newState[0])
        return newState
      })
    })
  }

  return {
    areTipsAttached,
    determineTipStatus,
    resetTipStatus,
    aPipetteWithTip,
    setTipStatusResolved,
    initialPipettesWithTipsCount: initialPipettesCount,
  }
}

// Return good pipettes from instrument data.
const validatePipetteInfo = (
  attachedInstruments: PipetteData[] | null
): PipetteData[] => {
  const goodPipetteInfo =
    attachedInstruments?.filter(
      instr => instr.instrumentType === 'pipette' && instr.ok
    ) ?? null

  if (goodPipetteInfo == null) {
    throw new Error(
      'Attached instrument pipettes differ from current state pipettes.'
    )
  }

  return goodPipetteInfo
}

// Associate pipette info with a pipette id.
const createPipetteInfoById = (
  runRecord: Run | null,
  pipetteInfo: PipetteData[]
): Record<string, PipetteData> => {
  const pipetteInfoById: Record<string, PipetteData> = {}

  runRecord?.data.pipettes.forEach(p => {
    const pipetteInfoForThisPipette = pipetteInfo.find(
      goodPipette => p.mount === goodPipette.mount
    )
    if (pipetteInfoForThisPipette != null) {
      pipetteInfoById[p.id] = pipetteInfoForThisPipette
    }
  })

  return pipetteInfoById
}

const getPipettesWithTipsData = (
  tipStates: Record<string, { hasTip: boolean }>,
  pipetteInfoById: Record<string, PipetteData>,
  commands: RunCommandSummary[]
): PipetteTipState[] => {
  return Object.entries(tipStates).map(([pipetteId, tipInfo]) => {
    const pipetteInfo = pipetteInfoById[pipetteId]
    const specs = getPipetteModelSpecs(pipetteInfo.instrumentModel)
    return {
      specs,
      mount: pipetteInfo.mount,
      hasTip: getMightHaveTipGivenCommands(Boolean(tipInfo.hasTip), commands),
    }
  })
}

const PICK_UP_TIP_COMMAND_TYPES: Array<RunCommandSummary['commandType']> = [
  'pickUpTip',
] as const

// Sometimes, the robot and the tip status util have different ideas of when tips are attached.
// For example, if a pickUpTip command fails, the robot does not think a tip is attached. However, we want to be
// conservative and prompt drop tip wizard in case there are tips attached unexpectedly.
const getMightHaveTipGivenCommands = (
  hasTip: boolean,
  commands: RunCommandSummary[]
): boolean => {
  const lastRunProtocolCommand = commands[commands.length - 1]

  if (
    PICK_UP_TIP_COMMAND_TYPES.includes(lastRunProtocolCommand.commandType) ||
    lastRunProtocolCommand?.error?.errorType === 'tipPhysicallyMissing'
  ) {
    return true
  } else {
    return hasTip
  }
}

const filterPipettesWithTips = (
  pipettesWithTipsData: PipetteTipState[]
): PipetteWithTip[] => {
  return pipettesWithTipsData.filter(
    pipette => pipette.specs != null && pipette.hasTip
  ) as PipetteWithTip[]
}
