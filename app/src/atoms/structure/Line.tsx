import { Box, BORDERS } from '@opentrons/components'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Box>

export function Line(props: Props): JSX.Element {
  return <Box borderBottom={BORDERS.lineBorder} {...props} data-testid="line" />
}
