import styled, { css } from 'styled-components'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  JUSTIFY_SPACE_BETWEEN,
  DIRECTION_ROW,
  TYPOGRAPHY,
  JUSTIFY_CENTER,
  RESPONSIVENESS,
  DISPLAY_INLINE_BLOCK,
} from '@opentrons/components'

import type { ReactNode } from 'react'

const Title = styled.h1`
  ${TYPOGRAPHY.h1Default};
  margin-bottom: ${SPACING.spacing8};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold};
    margin-bottom: 0;
    height: ${SPACING.spacing40};
    display: ${DISPLAY_INLINE_BLOCK};
  }
`

const TILE_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: ${SPACING.spacing32};
  height: 24.625rem;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 29.5rem;
  }
`
export interface TwoUpTileLayoutProps {
  /** main header text on left half */
  title: string
  /** paragraph text below title on left half */
  body: ReactNode
  /** entire contents of the right half */
  rightElement: ReactNode
  /** footer underneath both halves of content */
  footer: ReactNode
}

export function TwoUpTileLayout(props: TwoUpTileLayoutProps): JSX.Element {
  const { title, body, rightElement, footer } = props
  return (
    <Flex css={TILE_CONTAINER_STYLE}>
      <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing24}>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          flex="1"
          gridGap={SPACING.spacing16}
        >
          <Title>{title}</Title>
          {body}
        </Flex>
        <Flex flex="1" justifyContent={JUSTIFY_CENTER}>
          {rightElement}
        </Flex>
      </Flex>
      {footer}
    </Flex>
  )
}
