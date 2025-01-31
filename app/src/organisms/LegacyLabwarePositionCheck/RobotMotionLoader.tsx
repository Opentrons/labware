import styled from 'styled-components'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  RESPONSIVENESS,
  SIZE_4,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

interface RobotMotionLoaderProps {
  header?: string
  body?: string
}

export function RobotMotionLoader(props: RobotMotionLoaderProps): JSX.Element {
  const { header, body } = props
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_CENTER}
      alignItems={ALIGN_CENTER}
      minHeight="29.5rem"
      gridGap={SPACING.spacing24}
    >
      <Icon name="ot-spinner" spin size={SIZE_4} color={COLORS.grey50} />
      {header != null ? <LoadingText>{header}</LoadingText> : null}
      {body != null ? <LegacyStyledText as="p">{body}</LegacyStyledText> : null}
    </Flex>
  )
}

const LoadingText = styled.h1`
  ${TYPOGRAPHY.h1Default}

  p {
    text-transform: lowercase;
  }

  p::first-letter {
    text-transform: uppercase;
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`
