import { getPositionFromSlotId } from '@opentrons/shared-data'
import { getStagingAreaAddressableAreas } from '../../utils'
import type {
  AdditionalEquipmentName,
  DeckSlot,
} from '@opentrons/step-generation'
import type {
  CoordinateTuple,
  CutoutId,
  DeckDefinition,
} from '@opentrons/shared-data'
import type {
  AllTemporalPropertiesForTimelineFrame,
  LabwareOnDeck,
  ModuleOnDeck,
} from '../../step-forms'
import type { Fixture } from './DeckSetup/constants'

interface AdditionalEquipment {
  name: AdditionalEquipmentName
  id: string
  location?: string
}

interface SlotInformation {
  matchingLabwareFor4thColumn: LabwareOnDeck | null
  slotPosition: CoordinateTuple | null
  createdModuleForSlot?: ModuleOnDeck
  createdLabwareForSlot?: LabwareOnDeck
  createdNestedLabwareForSlot?: LabwareOnDeck
  createFixtureForSlots?: AdditionalEquipment[]
  preSelectedFixture?: Fixture
}

interface SlotInformationProps {
  deckSetup: AllTemporalPropertiesForTimelineFrame
  slot: DeckSlot
  deckDef?: DeckDefinition
}

const FOURTH_COLUMN_SLOTS = ['A4', 'B4', 'C4', 'D4']
const FOURTH_COLUMN_CONVERSION = { A4: 'A3', B4: 'B3', C4: 'C3', D4: 'D3' }

export const getSlotInformation = (
  props: SlotInformationProps
): SlotInformation => {
  const { slot, deckSetup, deckDef } = props
  const slotPosition =
    deckDef != null ? getPositionFromSlotId(slot, deckDef) ?? null : null
  const {
    labware: deckSetupLabware,
    modules: deckSetupModules,
    additionalEquipmentOnDeck,
  } = deckSetup
  const createdModuleForSlot = Object.values(deckSetupModules).find(
    module => module.slot === slot
  )
  const createdLabwareForSlot = Object.values(deckSetupLabware).find(
    lw => lw.slot === slot || lw.slot === createdModuleForSlot?.id
  )
  const createdNestedLabwareForSlot = Object.values(deckSetupLabware).find(
    lw => lw.slot === createdLabwareForSlot?.id
  )
  const createFixtureForSlots = Object.values(additionalEquipmentOnDeck).filter(
    ae => {
      const slotKey = FOURTH_COLUMN_SLOTS.includes(slot)
        ? FOURTH_COLUMN_CONVERSION[
            slot as keyof typeof FOURTH_COLUMN_CONVERSION
          ]
        : slot
      return ae.location?.split('cutout')[1] === slotKey
    }
  )

  const fixturesOnSlot = Object.values(additionalEquipmentOnDeck).filter(
    ae => ae.location?.split('cutout')[1] === slot
  )
  const stagingAreaCutout = fixturesOnSlot.find(
    fixture => fixture.name === 'stagingArea'
  )?.location

  let matchingLabware: LabwareOnDeck | null = null
  if (stagingAreaCutout != null) {
    const stagingAreaAddressableAreaName = getStagingAreaAddressableAreas([
      stagingAreaCutout,
    ] as CutoutId[])
    matchingLabware =
      Object.values(deckSetupLabware).find(
        lw => lw.slot === stagingAreaAddressableAreaName[0]
      ) ?? null
  }

  const preSelectedFixture =
    createFixtureForSlots != null && createFixtureForSlots.length === 2
      ? ('wasteChuteAndStagingArea' as Fixture)
      : (createFixtureForSlots[0]?.name as Fixture)

  return {
    createdModuleForSlot,
    createdLabwareForSlot,
    createdNestedLabwareForSlot,
    createFixtureForSlots,
    preSelectedFixture,
    slotPosition: slotPosition,
    matchingLabwareFor4thColumn: matchingLabware,
  }
}
