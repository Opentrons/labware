import { css } from 'styled-components'
import {
  Flex,
  Box,
  DIRECTION_ROW,
  SPACING,
  WRAP,
  RESPONSIVENESS,
} from '@opentrons/components'
import { TWO_COLUMN_ELEMENT_MIN_WIDTH } from './constants'

import type { ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'

export interface OneColumnOrTwoColumnProps extends StyleProps {
  children: [ReactNode, ReactNode]
}

export function OneColumnOrTwoColumn({
  children: [leftOrSingleElement, optionallyDisplayedRightElement],
  ...styleProps
}: OneColumnOrTwoColumnProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_ROW}
      gap={SPACING.spacing40}
      flexWrap={WRAP}
      {...styleProps}
    >
      <Box
        flex="1"
        css={css`
          min-width: ${TWO_COLUMN_ELEMENT_MIN_WIDTH};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            min-width: none;
            width: 100%;
          }
        `}
      >
        {leftOrSingleElement}
      </Box>
      <Box
        flex="1"
        minWidth={TWO_COLUMN_ELEMENT_MIN_WIDTH}
        css={css`
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            display: none;
          }
        `}
      >
        {optionallyDisplayedRightElement}
      </Box>
    </Flex>
  )
}
