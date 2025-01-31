import { forwardRef } from 'react'
import styled from 'styled-components'
import { Box } from '../../primitives'
import { BORDERS, COLORS } from '../../helix-design-system'
import { RobotCoordsForeignDiv } from '../../hardware-sim'

import { DeckLabel } from '../../molecules/DeckLabel'
import { SPACING } from '../../ui-style-constants'

import type { ForwardedRef } from 'react'
import type { DeckLabelProps } from '../../molecules/DeckLabel'

interface DeckLabelSetProps {
  deckLabels: DeckLabelProps[]
  x: number
  y: number
  width: number
  height: number
  invert?: boolean
}

const DeckLabelSetComponent = (
  props: DeckLabelSetProps,
  ref: ForwardedRef<HTMLDivElement>
): JSX.Element => {
  const { deckLabels, x, y, width, height, invert = false } = props

  return (
    <RobotCoordsForeignDiv
      x={x}
      y={y}
      innerDivProps={{
        style: {
          transform: `rotate(180deg) scaleX(-1) scaleY(${invert ? '-1' : '1'})`,
        },
      }}
    >
      <StyledBox
        width={width}
        height={height}
        data-testid="DeckLabeSet"
        isZoomed={deckLabels.length > 0 ? deckLabels[0].isZoomed : true}
      />
      <LabelContainer ref={ref}>
        {deckLabels.length > 0
          ? deckLabels.map((deckLabel, index) => (
              <DeckLabel
                key={`DeckLabel_${index}`}
                maxWidth={`calc(${width}px - ${SPACING.spacing16})`}
                {...deckLabel}
                isLast={deckLabels.length - 1 === index}
              />
            ))
          : null}
      </LabelContainer>
    </RobotCoordsForeignDiv>
  )
}

export const DeckLabelSet = forwardRef<HTMLDivElement, DeckLabelSetProps>(
  DeckLabelSetComponent
)

interface StyledBoxProps {
  isZoomed: boolean
}

const StyledBox = styled(Box)<StyledBoxProps>`
  border-radius: ${BORDERS.borderRadius4};
  border: ${({ isZoomed }) =>
    isZoomed ? `1.5px solid ${COLORS.blue50}` : `3px solid ${COLORS.blue50}`};
`

const LabelContainer = styled.div`
  padding-left: ${SPACING.spacing12};
  & > *:not(:first-child):not(:last-child) {
    border-bottom-right-radius: ${BORDERS.borderRadius4};
    border-top-right-radius: ${BORDERS.borderRadius4};
  }

  & > *:first-child {
    border-bottom-right-radius: ${BORDERS.borderRadius4};
  }

  & > *:last-child {
    border-bottom-left-radius: ${BORDERS.borderRadius4};
    border-bottom-right-radius: ${BORDERS.borderRadius4};
  }
`
