import type {
  AddressableAreaName,
  CommonCommandRunTimeInfo,
  CommonCommandCreateInfo,
  LabwareDefinition2,
  LabwareOffset,
  PipetteName,
  ModuleModel,
} from '../../js'

export interface LoadPipetteCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadPipette'
  params: LoadPipetteParams
}
export interface LoadPipetteRunTimeCommand
  extends CommonCommandRunTimeInfo,
    Omit<LoadPipetteCreateCommand, 'params'> {
  params: LoadPipetteParams & {
    pipetteName: PipetteName
  }
  result?: LoadPipetteResult
}
export interface LoadLabwareCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLabware'
  params: LoadLabwareParams
}
export interface LoadLabwareRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLabwareCreateCommand {
  result?: LoadLabwareResult
}
export interface LoadLidCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLid'
  params: LoadLidParams
}
export interface LoadLidRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLidCreateCommand {
  result?: LoadLidResult
}
export interface LoadLidStackCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLidStack'
  params: LoadLidStackParams
}
export interface LoadLidStackRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLidStackCreateCommand {
  result?: LoadLidStackResult
}
export interface ReloadLabwareCreateCommand extends CommonCommandCreateInfo {
  commandType: 'reloadLabware'
  params: { labwareId: string }
}
export interface ReloadLabwareRunTimeCommand
  extends CommonCommandRunTimeInfo,
    ReloadLabwareCreateCommand {
  result?: ReloadLabwareResult
}
export interface MoveLabwareCreateCommand extends CommonCommandCreateInfo {
  commandType: 'moveLabware'
  params: MoveLabwareParams
}
export interface MoveLabwareRunTimeCommand
  extends CommonCommandRunTimeInfo,
    MoveLabwareCreateCommand {
  result?: MoveLabwareResult
}
export interface LoadModuleCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadModule'
  params: LoadModuleParams
}
export interface LoadModuleRunTimeCommand
  extends CommonCommandRunTimeInfo,
    Omit<LoadModuleCreateCommand, 'params'> {
  params: LoadModuleParams & {
    model: ModuleModel
  }
  result?: LoadModuleResult
}
export interface LoadLiquidCreateCommand extends CommonCommandCreateInfo {
  commandType: 'loadLiquid'
  params: LoadLiquidParams
}
export interface LoadLiquidRunTimeCommand
  extends CommonCommandRunTimeInfo,
    LoadLiquidCreateCommand {
  result?: LoadLiquidResult
}

export interface ConfigureNozzleLayoutCreateCommand
  extends CommonCommandCreateInfo {
  commandType: 'configureNozzleLayout'
  params: ConfigureNozzleLayoutParams
}

export interface ConfigureNozzleLayoutRunTimeCommand
  extends CommonCommandRunTimeInfo,
    ConfigureNozzleLayoutCreateCommand {
  result?: {}
}

export type SetupRunTimeCommand =
  | ConfigureNozzleLayoutRunTimeCommand
  | LoadPipetteRunTimeCommand
  | LoadLabwareRunTimeCommand
  | ReloadLabwareRunTimeCommand
  | LoadModuleRunTimeCommand
  | LoadLiquidRunTimeCommand
  | MoveLabwareRunTimeCommand
  | LoadLidRunTimeCommand
  | LoadLidStackRunTimeCommand

export type SetupCreateCommand =
  | ConfigureNozzleLayoutCreateCommand
  | LoadPipetteCreateCommand
  | LoadLabwareCreateCommand
  | ReloadLabwareCreateCommand
  | LoadModuleCreateCommand
  | LoadLiquidCreateCommand
  | MoveLabwareCreateCommand
  | LoadLidCreateCommand
  | LoadLidStackCreateCommand

export type LabwareLocation =
  | 'offDeck'
  | 'systemLocation'
  | { slotName: string }
  | { moduleId: string }
  | { labwareId: string }
  | { addressableAreaName: AddressableAreaName }

export type OnDeckLabwareLocation =
  | { slotName: string }
  | { moduleId: string }
  | { labwareId: string }
  | { addressableAreaName: AddressableAreaName }

export type NonStackedLocation =
  | 'offDeck'
  | { slotName: string }
  | { moduleId: string }
  | { addressableAreaName: AddressableAreaName }

export interface ModuleLocation {
  slotName: string
}
export interface LoadPipetteParams {
  pipetteName: string
  pipetteId: string
  mount: 'left' | 'right'
}
interface LoadPipetteResult {
  pipetteId: string
}
interface LoadLabwareParams {
  location: LabwareLocation
  version: number
  namespace: string
  loadName: string
  displayName?: string
  labwareId?: string
}
interface LoadLabwareResult {
  labwareId: string
  definition: LabwareDefinition2
  // todo(mm, 2024-08-19): This does not match the server-returned offsetId field.
  // Confirm nothing client-side is trying to use this, then replace it with offsetId.
  offset: LabwareOffset
}
interface ReloadLabwareResult {
  labwareId: string
  offsetId?: string | null
}

export type LabwareMovementStrategy =
  | 'usingGripper'
  | 'manualMoveWithPause'
  | 'manualMoveWithoutPause'

export interface MoveLabwareParams {
  labwareId: string
  newLocation: LabwareLocation
  strategy: LabwareMovementStrategy
}
interface MoveLabwareResult {
  offsetId: string
}
interface LoadModuleParams {
  moduleId?: string
  location: ModuleLocation
  model: ModuleModel
}
interface LoadModuleResult {
  moduleId: string
}
interface LoadLiquidParams {
  liquidId: string
  labwareId: string
  volumeByWell: { [wellName: string]: number }
}
interface LoadLiquidResult {
  liquidId: string
}

export const COLUMN = 'COLUMN'
export const SINGLE = 'SINGLE'
export const ROW = 'ROW'
export const QUADRANT = 'QUADRANT'
export const ALL = 'ALL'

export type NozzleConfigurationStyle =
  | typeof COLUMN
  | typeof SINGLE
  | typeof ROW
  | typeof QUADRANT
  | typeof ALL

interface NozzleConfigurationParams {
  primaryNozzle?: string
  style: NozzleConfigurationStyle
}

export interface ConfigureNozzleLayoutParams {
  pipetteId: string
  configurationParams: NozzleConfigurationParams
}

interface LoadLidStackParams {
  location: LabwareLocation
  loadName: string
  namespace: string
  version: number
  quantity: number
}

interface LoadLidStackResult {
  stackLabwareId: string
  labwareIds: string[]
  definition: LabwareDefinition2
  location: LabwareLocation
}

interface LoadLidParams {
  location: LabwareLocation
  loadName: string
  namespace: string
  version: number
}

interface LoadLidResult {
  labwareId: string
  definition: LabwareDefinition2
}
