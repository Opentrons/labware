import { createSelector } from 'reselect'
import { getGroupedCommands } from './utils'

import type { State } from '../types'
import type { GroupedCommands, StoredProtocolData } from './types'

export const getStoredProtocols: (
  state: State
) => StoredProtocolData[] = createSelector(
  state => state.protocolStorage.protocolKeys,
  state => state.protocolStorage.filesByProtocolKey,
  (protocolKeys, filesByProtocolKey) =>
    protocolKeys
      .map(protocolKey => filesByProtocolKey[protocolKey])
      .filter((file): file is StoredProtocolData => file != null)
)

export const getStoredProtocol: (
  state: State,
  protocolKey?: string | null
) => StoredProtocolData | null = (state, protocolKey) =>
  protocolKey != null
    ? state.protocolStorage.filesByProtocolKey[protocolKey] ?? null
    : null

export const getIsProtocolAnalysisInProgress: (
  state: State,
  protocolKey: string
) => boolean = (state, protocolKey) =>
  state.protocolStorage.inProgressAnalysisProtocolKeys.includes(protocolKey)

export const getStoredProtocolGroupedCommands: (
  state: State,
  protocolKey?: string | null
) => GroupedCommands | null = (state, protocolKey) => {
  const storedProtocolData =
    protocolKey != null
      ? state.protocolStorage.filesByProtocolKey[protocolKey] ?? null
      : null

  if (storedProtocolData == null) {
    return null
  }
  const mostRecentAnalysis = storedProtocolData.mostRecentAnalysis
  const groupedCommands =
    mostRecentAnalysis != null &&
    mostRecentAnalysis.commandAnnotations != null &&
    mostRecentAnalysis.commandAnnotations.length > 0
      ? getGroupedCommands(mostRecentAnalysis)
      : []

  return groupedCommands
}
