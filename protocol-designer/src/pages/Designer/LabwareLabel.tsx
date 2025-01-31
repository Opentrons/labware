import { useRef, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { DeckLabelSet } from '@opentrons/components'
import { getDesignerTab } from '../../file-data/selectors'
import type { DeckLabelProps } from '@opentrons/components'
import type {
  CoordinateTuple,
  LabwareDefinition2,
} from '@opentrons/shared-data'

interface LabwareLabelProps {
  position: CoordinateTuple
  labwareDef: LabwareDefinition2
  isSelected: boolean
  isLast: boolean
  nestedLabwareInfo?: DeckLabelProps[]
  labelText?: string
}
export const LabwareLabel = (props: LabwareLabelProps): JSX.Element => {
  const {
    labwareDef,
    position,
    isSelected,
    isLast,
    nestedLabwareInfo = [],
    labelText = labwareDef.metadata.displayName,
  } = props
  const labelContainerRef = useRef<HTMLDivElement>(null)
  const designerTab = useSelector(getDesignerTab)
  const [labelContainerHeight, setLabelContainerHeight] = useState(0)

  const deckLabels = [
    ...nestedLabwareInfo,
    {
      text: labelText,
      isSelected: isSelected,
      isLast: isLast,
      isZoomed: designerTab === 'startingDeck',
    },
  ]

  useEffect(() => {
    if (labelContainerRef.current) {
      setLabelContainerHeight(labelContainerRef.current.offsetHeight)
    }
  }, [nestedLabwareInfo])

  return (
    <DeckLabelSet
      ref={labelContainerRef}
      deckLabels={deckLabels}
      x={position[0] - labwareDef.cornerOffsetFromSlot.x}
      y={position[1] + labwareDef.cornerOffsetFromSlot.y - labelContainerHeight}
      width={labwareDef.dimensions.xDimension}
      height={labwareDef.dimensions.yDimension}
    />
  )
}
