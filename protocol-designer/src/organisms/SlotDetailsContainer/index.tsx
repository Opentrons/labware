import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { getModuleDisplayName } from '@opentrons/shared-data'
import * as wellContentsSelectors from '../../top-selectors/well-contents'
import { selectors } from '../../labware-ingred/selectors'
import { selectors as uiLabwareSelectors } from '../../ui/labware'
import { getDeckSetupForActiveItem } from '../../top-selectors/labware-locations'
import { SlotInformation } from '../../organisms/SlotInformation'

import type { DeckSlotId, RobotType } from '@opentrons/shared-data'
import type { ContentsByWell } from '../../labware-ingred/types'

interface SlotDetailContainerProps {
  robotType: RobotType
  slot: DeckSlotId | null
  offDeckLabwareId?: string | null
}

export function SlotDetailsContainer(
  props: SlotDetailContainerProps
): JSX.Element | null {
  const { robotType, slot, offDeckLabwareId } = props
  const { t } = useTranslation('shared')
  const deckSetup = useSelector(getDeckSetupForActiveItem)
  const allWellContentsForActiveItem = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )
  const nickNames = useSelector(uiLabwareSelectors.getLabwareNicknamesById)
  const allIngredNamesIds = useSelector(selectors.allIngredientNamesIds)

  if (slot == null || (slot === 'offDeck' && offDeckLabwareId == null)) {
    return null
  }

  const {
    modules: deckSetupModules,
    labware: deckSetupLabwares,
    additionalEquipmentOnDeck,
  } = deckSetup

  const offDeckLabwareNickName =
    offDeckLabwareId != null ? nickNames[offDeckLabwareId] : null

  const moduleOnSlot = Object.values(deckSetupModules).find(
    module => module.slot === slot
  )
  const labwareOnSlot = Object.values(deckSetupLabwares).find(
    lw => lw.slot === slot || lw.slot === moduleOnSlot?.id
  )
  const nestedLabwareOnSlot = Object.values(deckSetupLabwares).find(
    lw => lw.slot === labwareOnSlot?.id
  )
  const fixturesOnSlot = Object.values(additionalEquipmentOnDeck).filter(
    ae => ae.location?.split('cutout')[1] === slot
  )
  const fixtureDisplayNames: string[] = fixturesOnSlot.map(fixture =>
    t(`${fixture.name}`)
  )
  const moduleDisplayName =
    moduleOnSlot != null ? getModuleDisplayName(moduleOnSlot.model) : null

  const liquidsLabware =
    nestedLabwareOnSlot != null ? nestedLabwareOnSlot : labwareOnSlot

  let wellContents: ContentsByWell | null = null
  if (offDeckLabwareId != null && allWellContentsForActiveItem != null) {
    wellContents = allWellContentsForActiveItem[offDeckLabwareId]
  } else if (allWellContentsForActiveItem != null && liquidsLabware != null) {
    wellContents = allWellContentsForActiveItem[liquidsLabware.id]
  }

  const liquids =
    wellContents != null
      ? Object.values(wellContents).flatMap(content => content.groupIds)
      : null

  const uniqueLiquids = Array.from(new Set(liquids))

  const liquidNamesOnLabware = uniqueLiquids
    .map(liquid => {
      const foundLiquid = Object.values(allIngredNamesIds).find(
        id => id.ingredientId === liquid
      )
      return foundLiquid?.name ?? ''
    })
    .filter(Boolean)

  const labwares: string[] = []
  const adapters: string[] = []
  if (offDeckLabwareNickName != null) {
    labwares.push(offDeckLabwareNickName)
  } else {
    if (nestedLabwareOnSlot != null && labwareOnSlot != null) {
      adapters.push(nickNames[labwareOnSlot.id])
      labwares.push(nickNames[nestedLabwareOnSlot.id])
    } else if (nestedLabwareOnSlot == null && labwareOnSlot != null) {
      labwares.push(nickNames[labwareOnSlot.id])
    }
  }

  return (
    <SlotInformation
      location={slot}
      robotType={robotType}
      modules={moduleDisplayName != null ? [moduleDisplayName] : []}
      labwares={labwares}
      adapters={adapters}
      fixtures={fixtureDisplayNames}
      liquids={liquidNamesOnLabware}
    />
  )
}
