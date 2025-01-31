import { css } from 'styled-components'
import { getModuleType } from '@opentrons/shared-data'
import { Flex } from '../../primitives'
import { ALIGN_CENTER, FLEX_MAX_CONTENT } from '../../styles'
import { COLORS } from '../../helix-design-system'
import { SPACING } from '../../ui-style-constants'
import { StyledText } from '../../atoms'
import { ModuleIcon } from '../../icons'

import type { FlattenSimpleInterpolation } from 'styled-components'
import type { ModuleModel } from '@opentrons/shared-data'

export interface DeckLabelProps {
  isZoomed: boolean
  text: string
  isSelected: boolean
  moduleModel?: ModuleModel
  maxWidth?: string
  labelBorderRadius?: string
  isLast?: boolean
}

export function DeckLabel({
  text,
  isSelected,
  labelBorderRadius,
  moduleModel,
  maxWidth = FLEX_MAX_CONTENT,
  isLast = false,
  isZoomed,
}: DeckLabelProps): JSX.Element {
  const DECK_LABEL_BASE_STYLE = (
    labelBorderRadius?: string
  ): FlattenSimpleInterpolation => css`
    width: ${FLEX_MAX_CONTENT};
    max-width: ${maxWidth};
    padding: ${SPACING.spacing2};
    border-radius: ${labelBorderRadius ?? '0'};
  `
  const DECK_LABEL_SELECTED_STYLE = (
    labelBorderRadius?: string
  ): FlattenSimpleInterpolation => css`
    ${DECK_LABEL_BASE_STYLE(labelBorderRadius)}
    color: ${COLORS.white};
    border: 1.5px solid ${COLORS.blue50};
    background-color: ${COLORS.blue50};
  `

  const DECK_LABEL_UNSELECTED_STYLE = (
    labelBorderRadius?: string,
    isLast?: boolean
  ): FlattenSimpleInterpolation => css`
    ${DECK_LABEL_BASE_STYLE(labelBorderRadius)}
    color: ${COLORS.blue50};
    border-right: 1.5px solid ${COLORS.blue50};
    border-bottom: 1.5px solid ${COLORS.blue50};
    border-left: 1.5px solid ${COLORS.blue50};
    background-color: ${COLORS.white};
    border-radius: ${isLast ? labelBorderRadius : '0'};
  `

  return (
    <Flex
      fontSize={isZoomed ? '6px' : '18px'}
      data-testid={`DeckLabel_${isSelected ? 'Selected' : 'UnSelected'}`}
      css={
        isSelected
          ? DECK_LABEL_SELECTED_STYLE(labelBorderRadius)
          : DECK_LABEL_UNSELECTED_STYLE(labelBorderRadius, isLast)
      }
    >
      <Flex gridGap={SPACING.spacing2} alignItems={ALIGN_CENTER}>
        {moduleModel != null && isZoomed ? (
          <ModuleIcon size="0.5rem" moduleType={getModuleType(moduleModel)} />
        ) : null}
        <StyledText color={isSelected ? COLORS.white : COLORS.blue50}>
          {text}
        </StyledText>
      </Flex>
    </Flex>
  )
}
