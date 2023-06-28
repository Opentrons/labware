import type {
  PipettingRunTimeCommand,
  PipettingCreateCommand,
} from './pipetting'
import type { GantryRunTimeCommand, GantryCreateCommand } from './gantry'
import type { ModuleRunTimeCommand, ModuleCreateCommand } from './module'
import type { SetupRunTimeCommand, SetupCreateCommand } from './setup'
import type { TimingRunTimeCommand, TimingCreateCommand } from './timing'
import type {
  AnnotationRunTimeCommand,
  AnnotationCreateCommand,
} from './annotation'
import type {
  CalibrationRunTimeCommand,
  CalibrationCreateCommand,
} from './calibration'

export * from './pipetting'
export * from './gantry'
export * from './module'
export * from './setup'
export * from './timing'
export * from './annotation'
export * from './calibration'

// NOTE: these key/value pairs will only be present on commands at analysis/run time
// they pertain only to the actual execution status of a command on hardware, as opposed to
// the command's identity and parameters which can be known prior to runtime

export type CommandStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export interface CommonCommandRunTimeInfo {
  key?: string
  id: string
  status: CommandStatus
  error?: RunCommandError | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  intent?: 'protocol' | 'setup'
}
export interface CommonCommandCreateInfo {
  key?: string
  meta?: { [key: string]: any }
}

export type CreateCommand =
  | PipettingCreateCommand // involves the pipettes plunger motor
  | GantryCreateCommand // movement that only effects the x,y,z position of the gantry/pipette
  | ModuleCreateCommand // directed at a hardware module
  | SetupCreateCommand // only effecting robot's equipment setup (pipettes, labware, modules, liquid), no hardware side-effects
  | TimingCreateCommand // effecting the timing of command execution
  | CalibrationCreateCommand // for automatic pipette calibration
  | AnnotationCreateCommand // annotating command execution

// commands will be required to have a key, but will not be created with one
type ExtendedRunTimeCommand<T> = T & CommonCommandRunTimeInfo

export type RunTimeCommand =
  | ExtendedRunTimeCommand<PipettingRunTimeCommand> // involves the pipettes plunger motor
  | ExtendedRunTimeCommand<GantryRunTimeCommand> // movement that only effects the x,y,z position of the gantry/pipette
  | ExtendedRunTimeCommand<ModuleRunTimeCommand> // directed at a hardware module
  | ExtendedRunTimeCommand<SetupRunTimeCommand> // only effecting robot's equipment setup (pipettes, labware, modules, liquid), no hardware side-effects
  | ExtendedRunTimeCommand<TimingRunTimeCommand> // effecting the timing of command execution
  | ExtendedRunTimeCommand<CalibrationRunTimeCommand> // for automatic pipette calibration
  | ExtendedRunTimeCommand<AnnotationRunTimeCommand> // annotating command execution

interface RunCommandError {
  id: string
  errorType: string
  createdAt: string
  detail: string
}
