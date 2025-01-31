import type { CutoutId, ModuleModel } from '@opentrons/shared-data'
import type { DeckSlot, LocationLiquidState } from '@opentrons/step-generation'
// TODO Ian 2018-02-19 make these shared in component library, standardize with Run App
//  ===== LABWARE ===========
export interface DisplayLabware {
  nickname: string | null | undefined
  disambiguationNumber?: number
}
export type LabwareTypeById = Record<string, string | null | undefined>
// ==== WELLS ==========
// TODO: Ian 2019-06-08 remove this in favor of WellGroup
export type Wells = Record<string, string>
export interface WellContents {
  // eg 'A1', 'A2' etc
  wellName?: string
  groupIds: string[]
  ingreds: LocationLiquidState
  highlighted?: boolean
  selected?: boolean
  maxVolume?: number
}
export type ContentsByWell = Record<string, WellContents> | null
export type WellContentsByLabware = Record<string, ContentsByWell>
// ==== INGREDIENTS ====
// TODO(ND: 12/17/2024): add migration for liquids in >8.3.0
export type OrderedLiquids = Array<{
  ingredientId: string
  name?: string | null
  displayColor?: string | null
  liquidClass?: string | null
}>
// TODO: Ian 2018-10-15 audit & rename these confusing types
export interface LiquidGroup {
  name: string | null
  description: string | null
  displayColor: string
  liquidClass: string | null
  serialize: boolean
}
export type IngredInputs = LiquidGroup & {
  volume?: number | null | undefined
}
export type IngredGroupAccessor = keyof IngredInputs
export type LiquidGroupsById = Record<string, LiquidGroup>
export type AllIngredGroupFields = Record<string, IngredInputs>

export type Fixture =
  | 'stagingArea'
  | 'trashBin'
  | 'wasteChute'
  | 'wasteChuteAndStagingArea'

export interface ZoomedIntoSlotInfoState {
  selectedLabwareDefUri: string | null
  selectedNestedLabwareDefUri: string | null
  selectedModuleModel: ModuleModel | null
  selectedFixture: Fixture | null
  selectedSlot: { slot: DeckSlot | null; cutout: CutoutId | null }
}

export interface GenerateNewProtocolState {
  isNewProtocol: boolean
}
