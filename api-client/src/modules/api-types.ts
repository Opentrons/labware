import type {
  ModuleType,
  Coordinates,
  ModuleModel,
} from '@opentrons/shared-data'

type PortGroup = 'main' | 'left' | 'right' | 'front' | 'unknown'
interface PhysicalPort {
  path: string | null
  port: number
  hub: boolean
  portGroup: PortGroup
  hubPort?: number
}

type ModuleOffsetSource =
  | 'default'
  | 'factory'
  | 'user'
  | 'calibration_check'
  | 'legacy'
  | 'unknown'

export interface ModuleOffset {
  offset: Coordinates
  slot?: string
  source?: ModuleOffsetSource
  last_modified?: string
}

export interface ApiBaseModule {
  id: string
  serialNumber: string
  hardwareRevision: string
  moduleModel: ModuleModel
  moduleType: ModuleType
  firmwareVersion: string
  hasAvailableUpdate: boolean
  usbPort: PhysicalPort
  compatibleWithRobot?: boolean
  moduleOffset?: ModuleOffset
}

export interface TemperatureData {
  currentTemperature: number
  targetTemperature: number | null
  status: TemperatureStatus
}

export interface MagneticData {
  engaged: boolean
  height: number
  status: MagneticStatus
}

export interface ThermocyclerData {
  // TODO(mc, 2019-12-12): in_between comes from the thermocycler firmware and
  // will be rare in normal operation due to limitations in current revision
  lidStatus: 'open' | 'closed' | 'in_between'
  lidTargetTemperature: number | null
  lidTemperatureStatus: TemperatureStatus
  lidTemperature: number | null
  currentTemperature: number | null
  targetTemperature: number | null
  holdTime: number | null
  rampRate: number | null
  totalStepCount: number | null
  currentStepIndex: number | null
  totalCycleCount: number | null
  currentCycleIndex: number | null
  status: ThermocyclerStatus
}
export interface HeaterShakerData {
  labwareLatchStatus: LatchStatus
  speedStatus: SpeedStatus
  temperatureStatus: TemperatureStatus
  currentSpeed: number | null
  currentTemperature: number | null
  targetSpeed: number | null
  targetTemperature: number | null
  errorDetails: string | null
  status: HeaterShakerStatus
}
export interface AbsorbanceReaderData {
  lidStatus: 'on' | 'off' | 'unknown'
  platePresence: 'present' | 'absent' | 'unknown'
  sampleWavelength: number | null
  status: AbsorbanceReaderStatus
}
export interface FlexStackerData {
  latchState: 'opened' | 'closed' | 'unknown'
  platformState: 'extended' | 'retracted' | 'unknown'
  hopperDoorState: 'opened' | 'closed' | 'unknown'
  axisStateX: 'extended' | 'retracted' | 'unknown'
  axisStateZ: 'extended' | 'retracted' | 'unknown'
  status: FlexStackerStatus
}

export type TemperatureStatus =
  | 'idle'
  | 'holding at target'
  | 'cooling'
  | 'heating'

export type ThermocyclerStatus =
  | 'idle'
  | 'holding at target'
  | 'cooling'
  | 'heating'
  | 'error'

export type MagneticStatus = 'engaged' | 'disengaged'

export type HeaterShakerStatus = 'idle' | 'running' | 'error'

export type SpeedStatus =
  | 'holding at target'
  | 'speeding up'
  | 'slowing down'
  | 'idle'
  | 'error'

export type LatchStatus =
  | 'opening'
  | 'idle_open'
  | 'closing'
  | 'idle_closed'
  | 'idle_unknown'
  | 'unknown'

export type AbsorbanceReaderStatus = 'idle' | 'measuring' | 'error'

export type FlexStackerStatus = 'idle' | 'dispensing' | 'storing' | 'error'
