import {
  Flex,
  SPACING,
  TYPOGRAPHY,
  LegacyStyledText,
} from '@opentrons/components'

import type { ComponentProps } from 'react'
import type { StyleProps } from '@opentrons/components'

interface OffsetVectorProps extends StyleProps {
  x: number
  y: number
  z: number
  as?: ComponentProps<typeof LegacyStyledText>['as']
}

export function OffsetVector(props: OffsetVectorProps): JSX.Element {
  const { x, y, z, as = 'h6', ...styleProps } = props
  return (
    <Flex {...styleProps}>
      <LegacyStyledText
        as={as}
        marginRight={SPACING.spacing4}
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
      >
        X
      </LegacyStyledText>
      <LegacyStyledText as={as} marginRight={SPACING.spacing8}>
        {x.toFixed(2)}
      </LegacyStyledText>
      <LegacyStyledText
        as={as}
        marginRight={SPACING.spacing4}
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
      >
        Y
      </LegacyStyledText>
      <LegacyStyledText as={as} marginRight={SPACING.spacing8}>
        {y.toFixed(2)}
      </LegacyStyledText>
      <LegacyStyledText
        as={as}
        marginRight={SPACING.spacing4}
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
      >
        Z
      </LegacyStyledText>
      <LegacyStyledText as={as} marginRight={SPACING.spacing8}>
        {z.toFixed(2)}
      </LegacyStyledText>
    </Flex>
  )
}
