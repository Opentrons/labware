import * as React from 'react'
import { css } from 'styled-components'
import { Flex } from '../../primitives'
import { FLEX_MAX_CONTENT } from '../../styles'
import { COLORS } from '../../helix-design-system'
import { SPACING } from '../../ui-style-constants'
import { StyledText } from '../../atoms'

import type { FlattenSimpleInterpolation } from 'styled-components'

interface DeckLabelProps {
  text: string
  isSelected: boolean
  labelBorderRadius?: string
}

export function DeckLabel({
  text,
  isSelected,
  labelBorderRadius,
}: DeckLabelProps): JSX.Element {
  return (
    <Flex
      data-testid={`DeckLabel_${isSelected ? 'Selected' : 'UnSelected'}`}
      css={
        isSelected
          ? DECK_LABEL_SELECTED_STYLE(labelBorderRadius)
          : DECK_LABEL_UNSELECTED_STYLE(labelBorderRadius)
      }
    >
      <StyledText
        desktopStyle="captionSemiBold"
        color={isSelected ? COLORS.white : COLORS.blue50}
      >
        {text}
      </StyledText>
    </Flex>
  )
}

const DECK_LABEL_BASE_STYLE = (
  labelBorderRadius?: string
): FlattenSimpleInterpolation => css`
  width: ${FLEX_MAX_CONTENT};
  padding: ${SPACING.spacing4};
  border-radius: ${labelBorderRadius ?? '0'};
`

const DECK_LABEL_SELECTED_STYLE = (
  labelBorderRadius?: string
): FlattenSimpleInterpolation => css`
  ${DECK_LABEL_BASE_STYLE(labelBorderRadius)}
  color: ${COLORS.white};
  border: 3px solid ${COLORS.blue50};
  background-color: ${COLORS.blue50};
`

const DECK_LABEL_UNSELECTED_STYLE = (
  labelBorderRadius?: string
): FlattenSimpleInterpolation => css`
  ${DECK_LABEL_BASE_STYLE(labelBorderRadius)}
  color: ${COLORS.blue50};
  border-right: 3px solid ${COLORS.blue50};
  border-bottom: 3px solid ${COLORS.blue50};
  border-left: 3px solid ${COLORS.blue50};
  background-color: ${COLORS.white};
`
