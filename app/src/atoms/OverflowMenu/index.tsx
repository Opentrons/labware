import * as React from 'react'
import {
  Box,
  COLORS,
  POSITION_ABSOLUTE,
  SPACING_1,
} from '@opentrons/components'

interface OverflowMenuProps {
  children: React.ReactNode
}

export const OverflowMenu = (props: OverflowMenuProps): JSX.Element | null => {
  return (
    <Box
      borderRadius="4px 4px 0px 0px"
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
      position={POSITION_ABSOLUTE}
      backgroundColor={COLORS.white}
      top="2.5rem"
      right={`calc(50% + ${SPACING_1})`}
    >
      {props.children}
    </Box>
  )
}
