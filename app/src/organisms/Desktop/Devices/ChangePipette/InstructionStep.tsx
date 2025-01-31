import { Box, Flex, JUSTIFY_SPACE_EVENLY, SPACING } from '@opentrons/components'
import type {
  PipetteChannels,
  PipetteDisplayCategory,
} from '@opentrons/shared-data'

import type { ReactNode } from 'react'
import type { Mount } from '@opentrons/components'
import type { Diagram, Direction } from './types'

interface Props {
  children: ReactNode
  direction: Direction
  mount: Mount
  channels: PipetteChannels
  diagram: Diagram
  displayCategory: PipetteDisplayCategory | null
}

export function InstructionStep(props: Props): JSX.Element {
  const {
    children,
    channels,
    diagram,
    displayCategory,
    mount,
    direction,
  } = props
  const channelsKey = channels === 8 ? 'multi' : 'single'

  const display =
    displayCategory === 'GEN2'
      ? new URL(
          `../../../../assets/images/change-pip/${direction}-${String(
            mount
          )}-${channelsKey}-GEN2-${diagram}@3x.png`,
          import.meta.url
        ).href
      : new URL(
          `../../../../assets/images/change-pip/${direction}-${String(
            mount
          )}-${channelsKey}-${diagram}@3x.png`,
          import.meta.url
        ).href

  return (
    <Flex justifyContent={JUSTIFY_SPACE_EVENLY}>
      <Box marginRight={SPACING.spacing40} width="18.6875rem">
        {children}
      </Box>
      <Box
        marginTop={diagram === 'tab' ? '4.1875rem' : SPACING.spacing12}
        marginLeft={diagram === 'tab' ? '1.5625rem' : SPACING.spacing40}
        marginRight={SPACING.spacing32}
      >
        <img
          src={display}
          height={diagram === 'tab' ? '100%' : '245px'}
          width={diagram === 'tab' ? '240px' : '200px'}
          alt={`${direction}-${String(mount)}-${channelsKey}-${String(
            displayCategory
          )}-${diagram}`}
        />
      </Box>
    </Flex>
  )
}
