import type {
  PAUSE_UNTIL_RESUME,
  PAUSE_UNTIL_TEMP,
  PAUSE_UNTIL_TIME,
} from './constants'
import type { IconName } from '@opentrons/components'
import type {
  LabwareLocation,
  NozzleConfigurationStyle,
} from '@opentrons/shared-data'
import type {
  AdditionalEquipmentEntity,
  ChangeTipOptions,
  LabwareEntity,
  PipetteEntity,
} from '@opentrons/step-generation'
export type StepIdType = string
export type StepFieldName = string

/* PIPETTING AND GRIPPER FIELDS */
// | 'aspirate_airGap_checkbox'
// | 'aspirate_airGap_volume'
// | 'aspirate_changeTip'
// | 'aspirate_flowRate'
// | 'aspirate_labware'
// | 'aspirate_mix_checkbox'
// | 'aspirate_mix_times'
// | 'aspirate_mix_volume'
// | 'aspirate_mmFromBottom'
// | 'aspirate_touchTip_checkbox'
// | 'aspirate_touchTip_mmFromBottom'
// | 'aspirate_wellOrder_first'
// | 'aspirate_wellOrder_second'
// | 'aspirate_wells_grouped'
// | 'aspirate_wells'
// | 'aspirate_x_position
// | 'aspirate_y_position
// | 'blowout_checkbox'
// | 'blowout_flowRate'
// | 'blowout_location'
// | 'blowout_z_offset'
// | 'changeTip'
// | 'dispense_flowRate'
// | 'dispense_labware'
// | 'dispense_mix_checkbox'
// | 'dispense_mix_times'
// | 'dispense_mix_volume'
// | 'dispense_mmFromBottom'
// | 'dispense_touchTip_checkbox'
// | 'dispense_touchTip_mmFromBottom'
// | 'dispense_wellOrder_first'
// | 'dispense_wellOrder_second'
// | 'dispense_wells'
// | 'dispense_x_position
// | 'dispense_y_position
// | 'disposalVolume_checkbox',
// | 'disposalVolume_volume',
// | 'dropTip_location'
// | 'dropTip_location'
// | 'labware'
// | 'labwareLocationUpdate'
// | 'message'
// | 'mix_mmFromBottom'
// | 'mix_touchTip_mmFromBottom'
// | 'mix_x_position
// | 'mix_y_position
// | 'newLocation'
// | 'nozzles'
// | 'path'
// | 'pauseAction'
// | 'pauseHour'
// | 'pauseMessage'
// | 'pauseMinute'
// | 'pauseSecond'
// | 'pickUpTip_location'
// | 'pickUpTip_wellNames'
// | 'pipette'
// | 'preWetTip'
// | 'stepDetails'
// | 'stepName'
// | 'times'
// | 'tipRack'
// | 'touchTip'
// | 'useGripper'
// | 'volume'
// | 'wells'

/* MODULE FIELDS */
// | 'blockIsActive'
// | 'blockIsActiveHold'
// | 'blockTargetTempHold'
// | 'engageHeight'
// | 'heaterShakerSetTimer'
// | 'heaterShakerTimerMinutes'
// | 'heaterShakerTimerSeconds'
// | 'latchOpen'
// | 'lidIsActive'
// | 'lidIsActiveHold'
// | 'lidOpen'
// | 'lidOpenHold'
// | 'lidTargetTemp'
// | 'lidTargetTempHold'
// | 'magnetAction'
// | 'moduleId'
// | 'orderedProfileItems'
// | 'profileItemsById'
// | 'profileTargetLidTemp'
// | 'profileVolume'
// | 'setHeaterShakerTemperature'
// | 'setShake'
// | 'setTemperature'
// | 'targetHeaterShakerTemperature'
// | 'targetSpeed'
// | 'targetTemperature'
// | 'thermocyclerFormType'

/* COMMENT FIELD */
// | message

/* DECK SETUP FIELDS */
// | 'labwareLocationUpdate'
// | 'moduleLocationUpdate'
// | 'pipetteLocationUpdate'

// // TODO: Ian 2019-01-17 below are DEPRECATED remove in #2916 (make sure to account for this in migration #2917)
// | 'aspirate_disposalVol_checkbox'
// | 'aspirate_disposalVol_volume'
// | 'aspirate_preWetTip'
// | 'aspirate_touchTip'
// | 'dispense_blowout_checkbox'
// | 'dispense_blowout_location'
// | 'dispense_touchTip'

// TODO Ian 2019-01-16 factor out to some constants.js ? See #2926
export type StepType =
  | 'comment'
  | 'heaterShaker'
  | 'magnet'
  | 'manualIntervention'
  | 'mix'
  | 'moveLabware'
  | 'moveLiquid'
  | 'pause'
  | 'temperature'
  | 'thermocycler'
  | 'plateReader'

export const stepIconsByType: Record<StepType, IconName> = {
  comment: 'comment',
  moveLabware: 'ot-move',
  moveLiquid: 'transfer',
  mix: 'mix',
  pause: 'pause-circle',
  manualIntervention: 'pause-circle',
  magnet: 'ot-magnet-v2',
  temperature: 'ot-temperature-v2',
  thermocycler: 'ot-thermocycler',
  heaterShaker: 'ot-heater-shaker',
  plateReader: 'ot-absorbance',
}
// ===== Unprocessed form types =====
export interface AnnotationFields {
  stepName: string
  stepDetails: string
}
export interface BlowoutFields {
  blowout_checkbox?: boolean
  blowout_location?: string
}
export interface ChangeTipFields {
  changeTip?: ChangeTipOptions
}
export type MixForm = AnnotationFields &
  BlowoutFields &
  ChangeTipFields & {
    id: StepIdType
    stepType: 'mix'
    labware?: string
    pipette?: string
    times?: string
    touchTip?: boolean
    volume?: string
    wells?: string[]
  }
export type PauseForm = AnnotationFields & {
  stepType: 'pause'
  id: StepIdType
  pauseAction?:
    | typeof PAUSE_UNTIL_RESUME
    | typeof PAUSE_UNTIL_TIME
    | typeof PAUSE_UNTIL_TEMP
  pauseMessage?: string
  pauseTemperature?: string
  pauseTime?: string
}
// TODO: separate field values from from metadata
export interface FormData {
  stepType: StepType
  id: StepIdType // TODO: form value processing to ensure type
  [key: string]: any
}
export const PROFILE_CYCLE: 'profileCycle' = 'profileCycle'
export const PROFILE_STEP: 'profileStep' = 'profileStep'
export interface ProfileStepItem {
  type: typeof PROFILE_STEP
  id: string
  title: string
  temperature: string
  durationMinutes: string
  durationSeconds: string
}
export interface ProfileCycleItem {
  type: typeof PROFILE_CYCLE
  id: string
  steps: ProfileStepItem[]
  repetitions: string
}
// TODO IMMEDIATELY: ProfileStepItem -> ProfileStep, ProfileCycleItem -> ProfileCycle
export type ProfileItem = ProfileStepItem | ProfileCycleItem
export type PathOption = 'single' | 'multiAspirate' | 'multiDispense'
export type WellOrderOption = 'l2r' | 'r2l' | 't2b' | 'b2t'
export type BlankForm = AnnotationFields & {
  stepType: StepType
  id: StepIdType
}

export interface HydratedMoveLiquidFormData {
  id: string
  stepType: 'moveLiquid'
  stepName: string
  fields: {
    aspirate_airGap_checkbox: boolean
    aspirate_delay_checkbox: boolean
    aspirate_labware: LabwareEntity
    aspirate_mix_checkbox: boolean
    aspirate_touchTip_checkbox: boolean
    aspirate_wellOrder_first: WellOrderOption
    aspirate_wellOrder_second: WellOrderOption
    aspirate_wells: string[]
    blowout_checkbox: boolean
    changeTip: ChangeTipOptions
    dispense_airGap_checkbox: boolean
    dispense_delay_checkbox: boolean
    dispense_labware: LabwareEntity | AdditionalEquipmentEntity
    dispense_mix_checkbox: boolean
    dispense_touchTip_checkbox: boolean
    dispense_wellOrder_first: WellOrderOption
    dispense_wellOrder_second: WellOrderOption
    dispense_wells: string[]
    disposalVolume_checkbox: boolean
    dropTip_location: string
    nozzles: NozzleConfigurationStyle | null
    path: PathOption
    pipette: PipetteEntity
    tipRack: string
    volume: number
    aspirate_airGap_volume?: number | null
    aspirate_delay_mmFromBottom?: number | null
    aspirate_delay_seconds?: number | null
    aspirate_flowRate?: number | null
    aspirate_mix_times?: number | null
    aspirate_mix_volume?: number | null
    aspirate_mmFromBottom?: number | null
    aspirate_touchTip_mmFromBottom?: number | null
    aspirate_wells_grouped?: boolean | null
    aspirate_x_position?: number | null
    aspirate_y_position?: number | null
    blowout_flowRate?: number | null
    blowout_location?: string | null
    blowout_z_offset?: number | null
    dispense_airGap_volume?: number | null
    dispense_delay_mmFromBottom?: number | null
    dispense_delay_seconds?: number | null
    dispense_flowRate?: number | null
    dispense_mix_times?: number | null
    dispense_mix_volume?: number | null
    dispense_mmFromBottom?: number | null
    dispense_touchTip_mmFromBottom?: number | null
    dispense_x_position?: number | null
    dispense_y_position?: number | null
    disposalVolume_volume?: number | null
    dropTip_wellNames?: string[] | null
    pickUpTip_location?: string | null
    pickUpTip_wellNames?: string[] | null
    preWetTip?: boolean | null
  }
  description?: string | null
}

export interface HydratedMoveLabwareFormData {
  id: string
  stepType: 'moveLabware'
  stepName: string
  fields: {
    labware: LabwareEntity
    newLocation: LabwareLocation
    useGripper: boolean
  }
  description?: string | null
}

export interface HydratedCommentFormData {
  id: string
  stepType: 'comment'
  stepName: string
  fields: {
    message: string
  }
  stepDetails?: string | null
}

export interface HydratedMixFormDataLegacy {
  aspirate_delay_checkbox: boolean
  blowout_checkbox: boolean
  changeTip: ChangeTipOptions
  dispense_delay_checkbox: boolean
  dropTip_location: string
  id: string
  labware: LabwareEntity
  mix_touchTip_checkbox: boolean
  mix_wellOrder_first: WellOrderOption
  mix_wellOrder_second: WellOrderOption
  nozzles: NozzleConfigurationStyle | null
  pipette: PipetteEntity
  stepName: string
  stepType: 'mix'
  tipRack: string
  volume: number
  wells: string[]
  aspirate_delay_seconds?: number | null
  aspirate_flowRate?: number | null
  blowout_flowRate?: number | null
  blowout_location?: string | null
  blowout_z_offset?: number | null
  dispense_delay_seconds?: number | null
  dispense_flowRate?: number | null
  dropTip_wellNames?: string[] | null
  mix_mmFromBottom?: number | null
  mix_touchTip_mmFromBottom?: number | null
  mix_x_position?: number | null
  mix_y_position?: number | null
  pickUpTip_location?: string | null
  pickUpTip_wellNames?: string[] | null
  stepDetails?: string | null
  times?: number | null
}
export type MagnetAction = 'engage' | 'disengage'
export type HydratedMagnetFormData = AnnotationFields & {
  engageHeight: string | null
  id: string
  magnetAction: MagnetAction
  moduleId: string | null
  stepDetails: string | null
  stepType: 'magnet'
}
export interface HydratedTemperatureFormData {
  id: string
  moduleId: string | null
  setTemperature: 'true' | 'false'
  stepDetails: string | null
  stepType: 'temperature'
  targetTemperature: string | null
}
export interface HydratedHeaterShakerFormData {
  heaterShakerSetTimer: boolean | null
  heaterShakerTimer: string | null
  id: string
  latchOpen: boolean
  moduleId: string
  setHeaterShakerTemperature: boolean
  setShake: boolean
  stepDetails: string | null
  stepType: 'heaterShaker'
  targetHeaterShakerTemperature: string | null
  targetSpeed: string | null
}
// TODO: Ian 2019-01-17 Moving away from this and towards nesting all form fields
// inside `fields` key, but deprecating transfer/consolidate/distribute is a pre-req
export type HydratedMoveLiquidFormDataLegacy = AnnotationFields &
  HydratedMoveLiquidFormData['fields'] & {
    id: string
    stepType: 'moveLiquid'
  }
// fields used in TipPositionInput
export type TipZOffsetFields =
  | 'aspirate_mmFromBottom'
  | 'dispense_mmFromBottom'
  | 'mix_mmFromBottom'
  | 'aspirate_touchTip_mmFromBottom'
  | 'dispense_touchTip_mmFromBottom'
  | 'aspirate_delay_mmFromBottom'
  | 'dispense_delay_mmFromBottom'
  | 'mix_touchTip_mmFromBottom'

export type TipYOffsetFields =
  | 'aspirate_y_position'
  | 'dispense_y_position'
  | 'mix_y_position'

export type TipXOffsetFields =
  | 'aspirate_x_position'
  | 'dispense_x_position'
  | 'mix_x_position'

export type DelayCheckboxFields =
  | 'aspirate_delay_checkbox'
  | 'dispense_delay_checkbox'

export type DelaySecondFields =
  | 'aspirate_delay_seconds'
  | 'dispense_delay_seconds'

export function getIsTouchTipField(fieldName: StepFieldName): boolean {
  const touchTipFields = [
    'aspirate_touchTip_mmFromBottom',
    'dispense_touchTip_mmFromBottom',
    'mix_touchTip_mmFromBottom',
  ]
  return touchTipFields.includes(fieldName)
}

export function getIsDelayPositionField(fieldName: string): boolean {
  const delayPositionFields = [
    'aspirate_delay_mmFromBottom',
    'dispense_delay_mmFromBottom',
  ]
  return delayPositionFields.includes(fieldName)
}
export type CountPerStepType = Partial<Record<StepType, number>>

//  TODO: get real HydratedFormData type
export interface HydratedFormdata {
  [key: string]: any
}
