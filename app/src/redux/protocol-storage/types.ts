// common types

import type {
  ProtocolAnalysisOutput,
  RunTimeCommand,
} from '@opentrons/shared-data'

export type ProtocolSort =
  | 'alphabetical'
  | 'reverse'
  | 'recent'
  | 'oldest'
  | 'flex'
  | 'ot2'

interface ParentNode {
  annotationIndex: number
  subCommands: LeafNode[]
  isHighlighted: boolean
}
export interface LeafNode {
  command: RunTimeCommand
  isHighlighted: boolean
}

export type GroupedCommands = Array<LeafNode | ParentNode>

export interface StoredProtocolDir {
  dirPath: string
  modified: number
  srcFilePaths: string[]
  analysisFilePaths: string[]
}

export interface StoredProtocolData {
  protocolKey: string
  modified: number
  srcFileNames: string[]
  srcFiles: Buffer[]
  mostRecentAnalysis: ProtocolAnalysisOutput | null
}

// state types

export interface ProtocolStorageState {
  readonly protocolKeys: string[]
  readonly filesByProtocolKey: {
    [protocolKey: string]: StoredProtocolData
  }
  readonly inProgressAnalysisProtocolKeys: string[]
  readonly addFailureFile: StoredProtocolDir | null
  readonly addFailureMessage: string | null
  readonly listFailureMessage: string | null
}

// action types

export type ProtocolListActionSource =
  | 'poll'
  | 'initial'
  | 'protocolAddition'
  | 'overwriteProtocol'

export interface FetchProtocolsAction {
  type: 'protocolStorage:FETCH_PROTOCOLS'
  meta: { shell: true }
}

export interface UpdateProtocolListAction {
  type: 'protocolStorage:UPDATE_PROTOCOL_LIST'
  payload: StoredProtocolData[]
  meta: { source: ProtocolListActionSource }
}

export interface UpdateProtocolListFailureAction {
  type: 'protocolStorage:UPDATE_PROTOCOL_LIST_FAILURE'
  payload: { message: string }
  meta: { source: ProtocolListActionSource }
}

export interface AddProtocolAction {
  type: 'protocolStorage:ADD_PROTOCOL'
  payload: { protocolFilePath: string }
  meta: { shell: true }
}

export interface RemoveProtocolAction {
  type: 'protocolStorage:REMOVE_PROTOCOL'
  payload: { protocolKey: string }
  meta: { shell: true }
}

export interface AddProtocolFailureAction {
  type: 'protocolStorage:ADD_PROTOCOL_FAILURE'
  payload: { protocol: StoredProtocolDir | null; message: string | null }
}

export interface ClearAddProtocolFailureAction {
  type: 'protocolStorage:CLEAR_ADD_PROTOCOL_FAILURE'
}

export interface OpenProtocolDirectoryAction {
  type: 'protocolStorage:OPEN_PROTOCOL_DIRECTORY'
  meta: { shell: true }
}

export interface AnalyzeProtocolAction {
  type: 'protocolStorage:ANALYZE_PROTOCOL'
  payload: { protocolKey: string }
  meta: { shell: true }
}

export interface AnalyzeProtocolSuccessAction {
  type: 'protocolStorage:ANALYZE_PROTOCOL_SUCCESS'
  payload: { protocolKey: string }
  meta: { shell: true }
}

export interface AnalyzeProtocolFailureAction {
  type: 'protocolStorage:ANALYZE_PROTOCOL_FAILURE'
  payload: { protocolKey: string }
  meta: { shell: true }
}

export interface ViewProtocolSourceFolder {
  type: 'protocolStorage:VIEW_PROTOCOL_SOURCE_FOLDER'
  payload: { protocolKey: string }
  meta: { shell: true }
}

export type ProtocolStorageAction =
  | FetchProtocolsAction
  | UpdateProtocolListAction
  | UpdateProtocolListFailureAction
  | AddProtocolAction
  | RemoveProtocolAction
  | AddProtocolFailureAction
  | ClearAddProtocolFailureAction
  | OpenProtocolDirectoryAction
  | AnalyzeProtocolAction
  | AnalyzeProtocolSuccessAction
  | AnalyzeProtocolFailureAction
  | ViewProtocolSourceFolder
