import { Flex, Box, DIRECTION_ROW, SPACING, WRAP } from '@opentrons/components'
import type { StyleProps } from '@opentrons/components'
import { TWO_COLUMN_ELEMENT_MIN_WIDTH } from './constants'

import type { ReactNode } from 'react'

export interface TwoColumnProps extends StyleProps {
  children: [ReactNode, ReactNode]
}

export function TwoColumn({
  children: [leftElement, rightElement],
  ...styleProps
}: TwoColumnProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_ROW}
      gap={SPACING.spacing40}
      flexWrap={WRAP}
      {...styleProps}
    >
      <Box flex="1" minWidth={TWO_COLUMN_ELEMENT_MIN_WIDTH}>
        {leftElement}
      </Box>
      <Box flex="1" minWidth={TWO_COLUMN_ELEMENT_MIN_WIDTH}>
        {rightElement}
      </Box>
    </Flex>
  )
}
