import { Box, BORDERS } from '@opentrons/components'
import type { ReactNode } from 'react'

export function StandInContent({
  children,
}: {
  children?: ReactNode
}): JSX.Element {
  return (
    <Box
      border="4px dashed #A864FFFF"
      borderRadius={BORDERS.borderRadius8}
      height="104px"
      backgroundColor="#A864FF19"
    >
      {children}
    </Box>
  )
}
