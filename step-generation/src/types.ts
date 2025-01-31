import type {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  ABSORBANCE_READER_TYPE,
  CreateCommand,
  LabwareDefinition2,
  ModuleType,
  ModuleModel,
  PipetteName,
  NozzleConfigurationStyle,
  LabwareLocation,
  PipetteMount as Mount,
  PipetteV2Specs,
  ShakeSpeedParams,
  LabwareMovementStrategy,
} from '@opentrons/shared-data'
import type { AtomicProfileStep } from '@opentrons/shared-data/protocol/types/schemaV4'
import type {
  TEMPERATURE_DEACTIVATED,
  TEMPERATURE_AT_TARGET,
  TEMPERATURE_APPROACHING_TARGET,
} from './constants'

// Copied from PD
export type DeckSlot = string
type THERMOCYCLER_STATE = 'thermocyclerState'
type THERMOCYCLER_PROFILE = 'thermocyclerProfile'
export interface LabwareTemporalProperties {
  slot: DeckSlot
}

export interface PipetteTemporalProperties {
  mount: Mount
  nozzles?: NozzleConfigurationStyle
}

export interface MagneticModuleState {
  type: typeof MAGNETIC_MODULE_TYPE
  engaged: boolean
}

export type TemperatureStatus =
  | typeof TEMPERATURE_DEACTIVATED
  | typeof TEMPERATURE_AT_TARGET
  | typeof TEMPERATURE_APPROACHING_TARGET

export interface TemperatureModuleState {
  type: typeof TEMPERATURE_MODULE_TYPE
  status: TemperatureStatus
  targetTemperature: number | null
}
export interface ThermocyclerModuleState {
  type: typeof THERMOCYCLER_MODULE_TYPE
  blockTargetTemp: number | null // null means block is deactivated
  lidTargetTemp: number | null // null means lid is deactivated
  lidOpen: boolean | null // if false, closed. If null, unknown
}

export interface HeaterShakerModuleState {
  type: typeof HEATERSHAKER_MODULE_TYPE
  targetTemp: number | null
  targetSpeed: number | null
  latchOpen: boolean | null
}
export interface MagneticBlockState {
  type: typeof MAGNETIC_BLOCK_TYPE
}

export interface Initialization {
  mode: 'single' | 'multi'
  wavelengths: number[]
  referenceWavelength?: number
}

export interface AbsorbanceReaderState {
  type: typeof ABSORBANCE_READER_TYPE
  lidOpen: boolean | null
  initialization: Initialization | null
}

export type ModuleState =
  | MagneticModuleState
  | TemperatureModuleState
  | ThermocyclerModuleState
  | HeaterShakerModuleState
  | MagneticBlockState
  | AbsorbanceReaderState
export interface ModuleTemporalProperties {
  slot: DeckSlot
  moduleState: ModuleState
}

export interface LabwareEntity {
  id: string
  labwareDefURI: string
  def: LabwareDefinition2
}
export interface LabwareEntities {
  [labwareId: string]: LabwareEntity
}

export interface ModuleEntity {
  id: string
  type: ModuleType
  model: ModuleModel
}

export interface ModuleEntities {
  [moduleId: string]: ModuleEntity
}

export interface NormalizedPipetteById {
  [pipetteId: string]: {
    name: PipetteName
    id: string
    tiprackDefURI: string[]
  }
}

export type AdditionalEquipmentName =
  | 'gripper'
  | 'wasteChute'
  | 'stagingArea'
  | 'trashBin'
export interface NormalizedAdditionalEquipmentById {
  [additionalEquipmentId: string]: {
    name: AdditionalEquipmentName
    id: string
    location?: string
  }
}

export type AdditionalEquipmentEntity = NormalizedAdditionalEquipmentById[keyof NormalizedAdditionalEquipmentById]
export interface AdditionalEquipmentEntities {
  [additionalEquipmentId: string]: AdditionalEquipmentEntity
}

export type NormalizedPipette = NormalizedPipetteById[keyof NormalizedPipetteById]

// "entities" have only properties that are time-invariant
// when they are de-normalized, the definitions they reference are baked in
// =========== PIPETTES ========
export type PipetteEntity = NormalizedPipette & {
  tiprackLabwareDef: LabwareDefinition2[]
  spec: PipetteV2Specs
}

export interface PipetteEntities {
  [pipetteId: string]: PipetteEntity
}

// ===== MIX-IN TYPES =====
export type ChangeTipOptions =
  | 'always'
  | 'once'
  | 'never'
  | 'perDest'
  | 'perSource'

export interface InnerMixArgs {
  volume: number
  times: number
}

export interface InnerDelayArgs {
  seconds: number
  mmFromBottom: number
}

interface CommonArgs {
  /** Optional user-readable name for this step */
  name: string | null | undefined
  /** Optional user-readable description/notes for this step */
  description: string | null | undefined
}

// ===== Processed form types. Used as args to call command creator fns =====

export type SharedTransferLikeArgs = CommonArgs & {
  tipRack: string // tipRackDefUri
  pipette: string // PipetteId
  nozzles: NozzleConfigurationStyle | null // setting for 96-channel
  sourceLabware: string
  destLabware: string
  /** volume is interpreted differently by different Step types */
  volume: number
  /** drop tip location entity id */
  dropTipLocation: string
  // ===== ASPIRATE SETTINGS =====
  /** Pre-wet tip with ??? uL liquid from the first source well. */
  preWetTip: boolean
  /** Touch tip after every aspirate */
  touchTipAfterAspirate: boolean
  /** Optional offset for touch tip after aspirate (if null, use PD default) */
  touchTipAfterAspirateOffsetMmFromTop: number
  /** changeTip is interpreted differently by different Step types */
  changeTip: ChangeTipOptions
  /** Delay after every aspirate */
  aspirateDelay: InnerDelayArgs | null | undefined
  /** Air gap after every aspirate */
  aspirateAirGapVolume: number | null
  /** Flow rate in uL/sec for all aspirates */
  aspirateFlowRateUlSec: number
  /** offset from bottom of well in mm */
  aspirateOffsetFromBottomMm: number
  /** x offset mm */
  aspirateXOffset: number
  /** y offset mm */
  aspirateYOffset: number

  // ===== DISPENSE SETTINGS =====
  /** Air gap after dispense */
  dispenseAirGapVolume: number | null
  /** Delay after every dispense */
  dispenseDelay: InnerDelayArgs | null | undefined
  /** Touch tip in destination well after dispense */
  touchTipAfterDispense: boolean
  /** Optional offset for touch tip after dispense (if null, use PD default) */
  touchTipAfterDispenseOffsetMmFromTop: number
  /** Flow rate in uL/sec for all dispenses */
  dispenseFlowRateUlSec: number
  /** offset from bottom of well in mm */
  dispenseOffsetFromBottomMm: number
  /** x offset mm */
  dispenseXOffset: number
  /** y offset mm */
  dispenseYOffset: number
}

export type ConsolidateArgs = SharedTransferLikeArgs & {
  commandCreatorFnName: 'consolidate'

  sourceWells: string[]
  destWell: string | null

  /** If given, blow out in the specified destination after dispense at the end of each asp-asp-dispense cycle */
  blowoutLocation: string | null | undefined
  blowoutFlowRateUlSec: number
  blowoutOffsetFromTopMm: number

  /** Mix in first well in chunk */
  mixFirstAspirate: InnerMixArgs | null | undefined
  /** Mix in destination well after dispense */
  mixInDestination: InnerMixArgs | null | undefined
}

export type TransferArgs = SharedTransferLikeArgs & {
  commandCreatorFnName: 'transfer'

  sourceWells: string[]
  destWells: string[] | null

  /** If given, blow out in the specified destination after dispense at the end of each asp-dispense cycle */
  blowoutLocation: string | null | undefined
  blowoutFlowRateUlSec: number
  blowoutOffsetFromTopMm: number

  /** Mix in first well in chunk */
  mixBeforeAspirate: InnerMixArgs | null | undefined
  /** Mix in destination well after dispense */
  mixInDestination: InnerMixArgs | null | undefined
}

export type DistributeArgs = SharedTransferLikeArgs & {
  commandCreatorFnName: 'distribute'

  sourceWell: string
  destWells: string[]

  /** Disposal volume is added to the volume of the first aspirate of each asp-asp-disp cycle */
  disposalVolume: number | null | undefined
  /** pass to blowout **/
  /** If given, blow out in the specified destination after dispense at the end of each asp-dispense cycle */
  blowoutLocation: string | null | undefined
  blowoutFlowRateUlSec: number
  blowoutOffsetFromTopMm: number

  /** Mix in first well in chunk */
  mixBeforeAspirate: InnerMixArgs | null | undefined
}

export type MixArgs = CommonArgs & {
  commandCreatorFnName: 'mix'
  tipRack: string // tipRackDefUri
  labware: string
  pipette: string
  nozzles: NozzleConfigurationStyle | null // setting for 96-channel
  wells: string[]
  /** Mix volume (should not exceed pipette max) */
  volume: number
  /** Times to mix (should be integer) */
  times: number
  /** Touch tip after mixing */
  touchTip: boolean
  touchTipMmFromTop: number
  /** change tip: see comments in step-generation/mix.js */
  changeTip: ChangeTipOptions
  /** drop tip location entity id */
  dropTipLocation: string
  /** If given, blow out in the specified destination after mixing each well */
  blowoutLocation: string | null | undefined
  blowoutFlowRateUlSec: number
  blowoutOffsetFromTopMm: number

  /**  z offset from bottom of well in mm */
  offsetFromBottomMm: number
  /** x offset */
  xOffset: number
  /** y offset */
  yOffset: number
  /** flow rates in uL/sec */
  aspirateFlowRateUlSec: number
  dispenseFlowRateUlSec: number
  /** delays */
  aspirateDelaySeconds: number | null | undefined
  dispenseDelaySeconds: number | null | undefined
}

export type PauseArgs = CommonArgs & {
  commandCreatorFnName: 'delay'
  message?: string
  seconds?: number
  pauseTemperature?: number | null
  meta:
    | {
        hours?: number
        minutes?: number
        seconds?: number
      }
    | null
    | undefined
}

export interface WaitForTemperatureArgs extends CommonArgs {
  moduleId: string
  commandCreatorFnName: 'waitForTemperature'
  celsius: number
  message?: string
}

export type EngageMagnetArgs = CommonArgs & {
  height: number
  moduleId: string
  commandCreatorFnName: 'engageMagnet'
  message?: string
}

export type DisengageMagnetArgs = CommonArgs & {
  moduleId: string
  commandCreatorFnName: 'disengageMagnet'
  message?: string
}

export interface SetTemperatureArgs extends CommonArgs {
  moduleId: string
  commandCreatorFnName: 'setTemperature'
  celsius: number
  message?: string
}

export interface DeactivateTemperatureArgs extends CommonArgs {
  moduleId: string
  commandCreatorFnName: 'deactivateTemperature'
  message?: string
}

export type SetShakeSpeedArgs = ShakeSpeedParams & {
  moduleId: string
  commandCreatorFnName: 'setShakeSpeed'
  message?: string
}

export interface HeaterShakerArgs extends CommonArgs {
  moduleId: string | null
  rpm: number | null
  commandCreatorFnName: 'heaterShaker'
  targetTemperature: number | null
  latchOpen: boolean
  timerMinutes: number | null
  timerSeconds: number | null
  message?: string
}

const PROFILE_CYCLE: 'profileCycle' = 'profileCycle'
const PROFILE_STEP: 'profileStep' = 'profileStep'

interface ProfileStepItem {
  type: typeof PROFILE_STEP
  id: string
  title: string
  temperature: string
  durationMinutes: string
  durationSeconds: string
}

interface ProfileCycleItem {
  type: typeof PROFILE_CYCLE
  id: string
  steps: ProfileStepItem[]
  repetitions: string
}

// TODO IMMEDIATELY: ProfileStepItem -> ProfileStep, ProfileCycleItem -> ProfileCycle
export type ProfileItem = ProfileStepItem | ProfileCycleItem

export interface ThermocyclerProfileStepArgs {
  moduleId: string
  commandCreatorFnName: THERMOCYCLER_PROFILE
  blockTargetTempHold: number | null
  lidOpenHold: boolean
  lidTargetTempHold: number | null
  message?: string
  profileSteps: AtomicProfileStep[]
  profileTargetLidTemp: number
  profileVolume: number
  meta?: {
    rawProfileItems: ProfileItem[]
  }
}

export interface ThermocyclerStateStepArgs {
  moduleId: string
  commandCreatorFnName: THERMOCYCLER_STATE
  blockTargetTemp: number | null
  lidTargetTemp: number | null
  lidOpen: boolean
  message?: string
}

export interface AbsorbanceReaderInitializeArgs extends CommonArgs {
  moduleId: string
  commandCreatorFnName: 'absorbanceReaderInitialize'
  measureMode: 'single' | 'multi'
  sampleWavelengths: number[]
  referenceWavelength?: number | null
  message?: string
}

export interface AbsorbanceReaderReadArgs extends CommonArgs {
  moduleId: string
  commandCreatorFnName: 'absorbanceReaderRead'
  fileName: string | null
  message?: string
}

export interface AbsorbanceReaderLidArgs extends CommonArgs {
  moduleId: string
  commandCreatorFnName: 'absorbanceReaderOpenLid' | 'absorbanceReaderCloseLid'
  message?: string
}

export type AbsorbanceReaderArgs =
  | AbsorbanceReaderInitializeArgs
  | AbsorbanceReaderReadArgs
  | AbsorbanceReaderLidArgs

export interface MoveLabwareArgs extends CommonArgs {
  commandCreatorFnName: 'moveLabware'
  labwareId: string
  newLocation: LabwareLocation
  strategy: LabwareMovementStrategy
}

export interface CommentArgs extends CommonArgs {
  commandCreatorFnName: 'comment'
  message: string
}

export type CommandCreatorArgs =
  | AbsorbanceReaderInitializeArgs
  | AbsorbanceReaderReadArgs
  | AbsorbanceReaderLidArgs
  | ConsolidateArgs
  | DistributeArgs
  | MixArgs
  | PauseArgs
  | TransferArgs
  | EngageMagnetArgs
  | DisengageMagnetArgs
  | SetTemperatureArgs
  | WaitForTemperatureArgs
  | DeactivateTemperatureArgs
  | ThermocyclerProfileStepArgs
  | ThermocyclerStateStepArgs
  | HeaterShakerArgs
  | MoveLabwareArgs
  | CommentArgs

export interface LocationLiquidState {
  [ingredGroup: string]: { volume: number }
}

export interface SingleLabwareLiquidState {
  [well: string]: LocationLiquidState
}

export interface LabwareLiquidState {
  [labwareId: string]: SingleLabwareLiquidState
}

export interface SourceAndDest {
  source: LocationLiquidState
  dest: LocationLiquidState
}

// Data that never changes across time
export interface Config {
  OT_PD_DISABLE_MODULE_RESTRICTIONS: boolean
}
export interface InvariantContext {
  labwareEntities: LabwareEntities
  moduleEntities: ModuleEntities
  pipetteEntities: PipetteEntities
  additionalEquipmentEntities: AdditionalEquipmentEntities
  config: Config
}

export interface TimelineFrame {
  pipettes: {
    [pipetteId: string]: PipetteTemporalProperties
  }
  labware: {
    [labwareId: string]: LabwareTemporalProperties
  }
  modules: {
    [moduleId: string]: ModuleTemporalProperties
  }
  tipState: {
    tipracks: {
      [labwareId: string]: {
        [wellName: string]: boolean // true if tip is in there
      }
    }
    pipettes: {
      [pipetteId: string]: boolean // true if pipette has tip(s)
    }
  }
  liquidState: {
    pipettes: {
      [pipetteId: string]: {
        /** tips are numbered 0-7. 0 is the furthest to the back of the robot.
         * For an 8-channel, on a 96-flat, Tip 0 is in row A, Tip 7 is in row H.
         */
        [tipId: string]: LocationLiquidState
      }
    }
    labware: {
      [labwareId: string]: {
        [well: string]: LocationLiquidState
      }
    }
    additionalEquipment: {
      /** for the waste chute and trash bin */
      [additionalEquipmentId: string]: LocationLiquidState
    }
  }
}
export type RobotState = TimelineFrame // legacy name alias

export type ErrorType =
  | 'ABSORBANCE_READER_LID_CLOSED'
  | 'ABSORBANCE_READER_NO_GRIPPER'
  | 'ABSORBANCE_READER_NO_INITIALIZATION'
  | 'CANNOT_MOVE_WITH_GRIPPER'
  | 'DROP_TIP_LOCATION_DOES_NOT_EXIST'
  | 'EQUIPMENT_DOES_NOT_EXIST'
  | 'GRIPPER_REQUIRED'
  | 'HEATER_SHAKER_EAST_WEST_LATCH_OPEN'
  | 'HEATER_SHAKER_EAST_WEST_MULTI_CHANNEL'
  | 'HEATER_SHAKER_IS_SHAKING'
  | 'HEATER_SHAKER_LATCH_CLOSED'
  | 'HEATER_SHAKER_LATCH_OPEN'
  | 'HEATER_SHAKER_NORTH_SOUTH__OF_NON_TIPRACK_WITH_MULTI_CHANNEL'
  | 'HEATER_SHAKER_NORTH_SOUTH_EAST_WEST_SHAKING'
  | 'INSUFFICIENT_TIPS'
  | 'INVALID_SLOT'
  | 'LABWARE_DISCARDED_IN_WASTE_CHUTE'
  | 'LABWARE_DOES_NOT_EXIST'
  | 'LABWARE_OFF_DECK'
  | 'LABWARE_ON_ANOTHER_ENTITY'
  | 'MISMATCHED_SOURCE_DEST_WELLS'
  | 'MISSING_96_CHANNEL_TIPRACK_ADAPTER'
  | 'MISSING_MODULE'
  | 'MISSING_TEMPERATURE_STEP'
  | 'MODULE_PIPETTE_COLLISION_DANGER'
  | 'NO_TIP_ON_PIPETTE'
  | 'NO_TIP_SELECTED'
  | 'PIPETTE_DOES_NOT_EXIST'
  | 'PIPETTE_HAS_TIP'
  | 'PIPETTE_VOLUME_EXCEEDED'
  | 'PIPETTING_INTO_COLUMN_4'
  | 'POSSIBLE_PIPETTE_COLLISION'
  | 'REMOVE_96_CHANNEL_TIPRACK_ADAPTER'
  | 'TALL_LABWARE_EAST_WEST_OF_HEATER_SHAKER'
  | 'THERMOCYCLER_LID_CLOSED'
  | 'TIP_VOLUME_EXCEEDED'

export interface CommandCreatorError {
  message: string
  type: ErrorType
}

export type WarningType =
  | 'ASPIRATE_MORE_THAN_WELL_CONTENTS'
  | 'ASPIRATE_FROM_PRISTINE_WELL'
  | 'LABWARE_IN_WASTE_CHUTE_HAS_LIQUID'
  | 'TIPRACK_IN_WASTE_CHUTE_HAS_TIPS'
  | 'TEMPERATURE_IS_POTENTIALLY_UNREACHABLE'

export interface CommandCreatorWarning {
  message: string
  type: WarningType
}

export interface CommandsAndRobotState {
  commands: CreateCommand[]
  robotState: RobotState
  warnings?: CommandCreatorWarning[]
  python?: string
}

export interface CommandCreatorErrorResponse {
  errors: CommandCreatorError[]
  warnings?: CommandCreatorWarning[]
}

export interface CommandsAndWarnings {
  commands: CreateCommand[]
  warnings?: CommandCreatorWarning[]
  python?: string
}
export type CommandCreatorResult =
  | CommandsAndWarnings
  | CommandCreatorErrorResponse
export type CommandCreator<Args> = (
  args: Args,
  invariantContext: InvariantContext,
  prevRobotState: RobotState
) => CommandCreatorResult
export type CurriedCommandCreator = (
  invariantContext: InvariantContext,
  prevRobotState: RobotState
) => CommandCreatorResult

export interface Timeline {
  timeline: CommandsAndRobotState[] // TODO: Ian 2018-06-14 avoid timeline.timeline shape, better names
  errors?: CommandCreatorError[] | null
}

export interface RobotStateAndWarnings {
  robotState: RobotState
  warnings: CommandCreatorWarning[]
}
