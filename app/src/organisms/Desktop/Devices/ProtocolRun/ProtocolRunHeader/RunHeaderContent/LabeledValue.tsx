import {
  DIRECTION_COLUMN,
  COLORS,
  SPACING,
  Flex,
  StyledText,
} from '@opentrons/components'

import type { ReactNode } from 'react'

interface LabeledValueProps {
  label: string
  value: ReactNode
}

export function LabeledValue(props: LabeledValueProps): JSX.Element {
  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
      <StyledText as="h6" color={COLORS.grey60}>
        {props.label}
      </StyledText>
      {typeof props.value === 'string' ? (
        <StyledText desktopStyle="bodyDefaultRegular">{props.value}</StyledText>
      ) : (
        props.value
      )}
    </Flex>
  )
}
