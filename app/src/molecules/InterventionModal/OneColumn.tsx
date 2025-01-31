import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
} from '@opentrons/components'

import type { ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'

export interface OneColumnProps extends StyleProps {
  children: ReactNode
}

export function OneColumn({
  children,
  ...styleProps
}: OneColumnProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      width="100%"
      {...styleProps}
    >
      {children}
    </Flex>
  )
}
