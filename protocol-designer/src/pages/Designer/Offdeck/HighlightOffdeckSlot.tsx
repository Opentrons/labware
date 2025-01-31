import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { DeckLabelSet, Flex, POSITION_RELATIVE } from '@opentrons/components'
import {
  getHoveredDropdownItem,
  getSelectedDropdownItem,
} from '../../../ui/steps/selectors'
import type { CoordinateTuple } from '@opentrons/shared-data'
import type { LabwareOnDeck } from '../../../step-forms'

interface HighlightOffdeckSlotProps {
  labwareOnDeck?: LabwareOnDeck
  position: CoordinateTuple
}

export function HighlightOffdeckSlot(
  props: HighlightOffdeckSlotProps
): JSX.Element | null {
  const { labwareOnDeck, position } = props
  const { t } = useTranslation('application')
  const hoveredDropdownItem = useSelector(getHoveredDropdownItem)
  const selectedDropdownSelection = useSelector(getSelectedDropdownItem)

  if (labwareOnDeck != null) {
    const isLabwareSelectionSelected = selectedDropdownSelection.some(
      selected => selected.id === labwareOnDeck?.id
    )
    const highlighted = hoveredDropdownItem.id === labwareOnDeck?.id
    if (highlighted ?? isLabwareSelectionSelected) {
      return (
        <Flex position={POSITION_RELATIVE} top="-6.3rem">
          <DeckLabelSet
            deckLabels={[
              {
                text: isLabwareSelectionSelected ? t('selected') : t('select'),
                isSelected: isLabwareSelectionSelected,
                isLast: true,
                isZoomed: false,
              },
            ]}
            x={position[0] - labwareOnDeck.def.cornerOffsetFromSlot.x}
            y={position[1] + labwareOnDeck.def.cornerOffsetFromSlot.y}
            width={153}
            height={102}
            invert={true}
          />
        </Flex>
      )
    }
  } else {
    const highlightedNewLocation = hoveredDropdownItem.id === 'offDeck'
    const selected = selectedDropdownSelection.some(
      selected => selected.id === 'offDeck'
    )
    if (highlightedNewLocation ?? selected) {
      return (
        <DeckLabelSet
          deckLabels={[
            {
              text: t('location'),
              isSelected: selected,
              isLast: true,
              isZoomed: false,
            },
          ]}
          x={0}
          y={0}
          width={153}
          height={102}
          invert={true}
        />
      )
    }
  }
  return null
}
