import { useSelector } from 'react-redux'
import { getLabwareEntities } from '../../step-forms/selectors'
import { getHoveredStepLabware } from '../../ui/steps'
import { getDesignerTab } from '../../file-data/selectors'
import { LabwareLabel } from './LabwareLabel'
import type { CoordinateTuple } from '@opentrons/shared-data'
import type { LabwareOnDeck } from '../../step-forms'

interface HighlightLabwareProps {
  labwareOnDeck: LabwareOnDeck
  position: CoordinateTuple
}

export function HighlightLabware(
  props: HighlightLabwareProps
): JSX.Element | null {
  const { labwareOnDeck, position } = props
  const labwareEntities = useSelector(getLabwareEntities)
  const hoveredLabware = useSelector(getHoveredStepLabware)
  const tab = useSelector(getDesignerTab)
  const adapterId =
    labwareEntities[labwareOnDeck.slot] != null
      ? labwareEntities[labwareOnDeck.slot].id
      : null

  const highlighted = hoveredLabware.includes(adapterId ?? labwareOnDeck.id)

  if (tab === 'protocolSteps') {
    return null
  }
  if (highlighted) {
    return (
      <LabwareLabel
        isSelected={true}
        isLast={true}
        position={position}
        labwareDef={labwareOnDeck.def}
      />
    )
  }
  return null
}
