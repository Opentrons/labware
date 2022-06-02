import { useSelector } from 'react-redux'
import {
  parseAllRequiredModuleModelsById,
  parseInitialLoadedLabwareById,
  parseInitialLoadedLabwareDefinitionsById,
  parseInitialPipetteNamesById,
} from '@opentrons/api-client'
import { useProtocolQuery, useRunQuery } from '@opentrons/react-api-client'

import { getStoredProtocol } from '../../../redux/protocol-storage'

import type {
  LoadedLabwareById,
  LoadedLabwareDefinitionsById,
  ModuleModelsById,
  PipetteNamesById,
} from '@opentrons/api-client'
import type { ProtocolAnalysisOutput } from '@opentrons/shared-data'
import type { State } from '../../../redux/types'

export interface StoredProtocolAnalysis extends ProtocolAnalysisOutput {
  pipettes: PipetteNamesById
  modules: ModuleModelsById
  labware: LoadedLabwareById
  labwareDefinitions: LoadedLabwareDefinitionsById
}

export function useStoredProtocolAnalysis(
  runId: string | null
): StoredProtocolAnalysis | null {
  const { data: runRecord } = useRunQuery(runId, { staleTime: Infinity })
  const protocolId = runRecord?.data?.protocolId ?? null

  const { data: protocolRecord } = useProtocolQuery(protocolId, {
    staleTime: Infinity,
  })

  const protocolKey = protocolRecord?.data?.key

  const storedProtocolAnalysis =
    useSelector((state: State) => getStoredProtocol(state, protocolKey))
      ?.mostRecentAnalysis ?? null

  const pipettes = parseInitialPipetteNamesById(
    storedProtocolAnalysis?.commands ?? []
  )
  const modules = parseAllRequiredModuleModelsById(
    storedProtocolAnalysis?.commands ?? []
  )
  const labware = parseInitialLoadedLabwareById(
    storedProtocolAnalysis?.commands ?? []
  )
  const labwareDefinitions = parseInitialLoadedLabwareDefinitionsById(
    storedProtocolAnalysis?.commands ?? []
  )

  return storedProtocolAnalysis != null
    ? {
        ...storedProtocolAnalysis,
        pipettes,
        modules,
        labware,
        labwareDefinitions,
      }
    : null
}
