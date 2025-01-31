import { Box, COLORS, SPACING } from '@opentrons/components'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Box>

export function Divider(props: Props): JSX.Element {
  const { marginY } = props
  return (
    <Box
      borderBottom={`1px solid ${String(COLORS.grey30)}`}
      marginY={marginY ?? SPACING.spacing4}
      {...props}
      data-testid="divider"
    />
  )
}
