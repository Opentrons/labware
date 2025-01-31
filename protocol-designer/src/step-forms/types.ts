import type { Mount } from '@opentrons/components'
import type {
  ModuleType,
  ModuleModel,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  ABSORBANCE_READER_TYPE,
  NozzleConfigurationStyle,
} from '@opentrons/shared-data'
import type { DeckSlot } from '../types'

import type {
  TemperatureStatus,
  ModuleEntity,
  PipetteEntity,
  LabwareEntity,
  AdditionalEquipmentEntity,
} from '@opentrons/step-generation'
export interface FormPipette {
  pipetteName?: string | null
  tiprackDefURI?: string[] | null
}
export interface FormPipettesByMount {
  left: FormPipette
  right: FormPipette
}
// =========== MODULES ========
export interface FormModule {
  model: ModuleModel
  type: ModuleType
  slot: DeckSlot
}
export type FormModules = Record<number, FormModule>
export type ModuleEntities = Record<string, ModuleEntity>
// NOTE: semi-redundant 'type' key in FooModuleState types is required for Flow to disambiguate 'moduleState'
export interface MagneticModuleState {
  type: typeof MAGNETIC_MODULE_TYPE
  engaged: boolean
}
export interface TemperatureModuleState {
  type: typeof TEMPERATURE_MODULE_TYPE
  status: TemperatureStatus
  targetTemperature: number | null
}
export interface ThermocyclerModuleState {
  type: typeof THERMOCYCLER_MODULE_TYPE
  blockTargetTemp: number | null
  // null means block is deactivated
  lidTargetTemp: number | null
  // null means lid is deactivated
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
export interface AbsorbanceReaderState {
  type: typeof ABSORBANCE_READER_TYPE
  lidOpen: boolean | null
}
export interface ModuleTemporalProperties {
  slot: DeckSlot
  moduleState:
    | MagneticModuleState
    | TemperatureModuleState
    | ThermocyclerModuleState
    | HeaterShakerModuleState
    | MagneticBlockState
    | AbsorbanceReaderState
}
export type ModuleOnDeck = ModuleEntity & ModuleTemporalProperties
export type ModulesForEditModulesCard = Partial<
  Record<ModuleType, ModuleOnDeck[] | null | undefined>
>
// =========== LABWARE ========
export type NormalizedLabwareById = Record<
  string,
  {
    labwareDefURI: string
  }
>
export type NormalizedLabware = NormalizedLabwareById[keyof NormalizedLabwareById]
// =========== TEMPORAL ONLY =====
// Temporal properties (eg location) that are time-variant
export interface LabwareTemporalProperties {
  slot: DeckSlot
}
export interface PipetteTemporalProperties {
  mount: Mount
  nozzles?: NozzleConfigurationStyle
  prevNozzles?: NozzleConfigurationStyle
}
// =========== ON DECK ========
// The "on deck" types are entities with added properties (slot / mount)
// which may change across time (eg moving a labware to another slot)
export type LabwareOnDeck = LabwareEntity & LabwareTemporalProperties
export type PipetteOnDeck = PipetteEntity & PipetteTemporalProperties
export type AdditionalEquipmentOnDeck = AdditionalEquipmentEntity
// TODO: Ian 2019-11-08 make all values Maybe typed

export type InitialDeckSetup = AllTemporalPropertiesForTimelineFrame

export interface AllTemporalPropertiesForTimelineFrame {
  labware: {
    [labwareId: string]: LabwareOnDeck
  }
  pipettes: {
    [pipetteId: string]: PipetteOnDeck
  }
  modules: {
    [moduleId: string]: ModuleOnDeck
  }
  additionalEquipmentOnDeck: {
    [additionalEquipmentId: string]: AdditionalEquipmentOnDeck
  }
}
