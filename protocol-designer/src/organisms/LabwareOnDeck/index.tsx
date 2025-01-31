import { useSelector } from 'react-redux'
import { LabwareRender } from '@opentrons/components'

import { selectors } from '../../labware-ingred/selectors'
import * as wellContentsSelectors from '../../top-selectors/well-contents'
import * as highlightSelectors from '../../top-selectors/substep-highlight'
import * as tipContentsSelectors from '../../top-selectors/tip-contents'
import { wellFillFromWellContents } from './utils'
import type { LabwareOnDeck as LabwareOnDeckType } from '../../step-forms'

interface LabwareOnDeckProps {
  labwareOnDeck: LabwareOnDeckType
  x: number
  y: number
}

export function LabwareOnDeck(props: LabwareOnDeckProps): JSX.Element {
  const { labwareOnDeck, x, y } = props
  const missingTipsByLabwareId = useSelector(
    tipContentsSelectors.getMissingTipsByLabwareId
  )
  const allWellContentsForActiveItem = useSelector(
    wellContentsSelectors.getAllWellContentsForActiveItem
  )
  const allHighlightedWells = useSelector(
    highlightSelectors.wellHighlightsByLabwareId
  )
  const liquidDisplayColors = useSelector(selectors.getLiquidDisplayColors)
  const wellContents = allWellContentsForActiveItem
    ? allWellContentsForActiveItem[labwareOnDeck.id]
    : null
  const highlightedWells = allHighlightedWells[labwareOnDeck.id]
  const missingTips = missingTipsByLabwareId
    ? missingTipsByLabwareId[labwareOnDeck.id]
    : null

  return (
    <g transform={`translate(${x}, ${y})`}>
      <LabwareRender
        definition={labwareOnDeck.def}
        wellFill={wellFillFromWellContents(wellContents, liquidDisplayColors)}
        highlightedWells={highlightedWells}
        missingTips={missingTips}
      />
    </g>
  )
}
