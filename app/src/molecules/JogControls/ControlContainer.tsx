import { css } from 'styled-components'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'

import type { ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'

interface ControlContainerProps extends StyleProps {
  title: string
  children: ReactNode
}

const CONTROL_CHILDREN_STYLES = css`
  background-color: ${COLORS.grey10};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing16};
  width: 100%;
  height: 9.75rem;

  @media screen and (max-width: 750px) {
    height: 15.875rem;
    justify-content: ${JUSTIFY_CENTER};
  }
`

export const ControlContainer = (props: ControlContainerProps): JSX.Element => {
  const { title, children } = props
  return (
    <Flex width="100%" flexDirection={DIRECTION_COLUMN}>
      <LegacyStyledText as="h6" marginY={SPACING.spacing8}>
        {title}
      </LegacyStyledText>
      <Flex css={CONTROL_CHILDREN_STYLES}>{children}</Flex>
    </Flex>
  )
}
