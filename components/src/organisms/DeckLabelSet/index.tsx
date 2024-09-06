import * as React from 'react'
import styled from 'styled-components'
import { Box } from '../../primitives'
import { BORDERS, COLORS } from '../../helix-design-system'
import { RobotCoordsForeignDiv } from '../../hardware-sim'

import { DeckLabel } from '../../molecules/DeckLabel'
import { SPACING } from '../../ui-style-constants'

import type { DeckLabelProps } from '../../molecules/DeckLabel'

interface DeckLabelSetProps {
  deckLabels: DeckLabelProps[]
  x: number
  y: number
  width: number
  height: number
}

export function DeckLabelSet({
  deckLabels,
  x,
  y,
  width,
  height,
}: DeckLabelSetProps): JSX.Element {
  const StyledBox = styled(Box)`
    border-radius: ${BORDERS.borderRadius4};
    border: 1.5px solid ${COLORS.blue50};
  `

  const LabelContainer = styled(Box)`
    padding-left: ${SPACING.spacing12};
    & > *:not(:last-child) {
      margin-bottom: -1.5px;
    }
    & > *:last-child {
      border-bottom-left-radius: ${BORDERS.borderRadius4};
      border-bottom-right-radius: ${BORDERS.borderRadius4};
    }
  `

  return (
    <RobotCoordsForeignDiv x={x} y={y}>
      <StyledBox width={width} height={height} data-testid="DeckLabeSet" />
      <LabelContainer>
        {deckLabels.length > 0
          ? deckLabels.map((deckLabel, index) => (
              <DeckLabel
                key={`DeckLabel_${index}`}
                {...deckLabel}
                isLast={deckLabels.length - 1 === index}
              />
            ))
          : null}
      </LabelContainer>
    </RobotCoordsForeignDiv>
  )
}
