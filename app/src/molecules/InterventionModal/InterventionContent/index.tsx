import {
  Flex,
  StyledText,
  DIRECTION_COLUMN,
  SPACING,
  RESPONSIVENESS,
} from '@opentrons/components'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { InterventionInfo } from './InterventionInfo'

import type { ComponentProps } from 'react'

export type { InterventionInfoProps } from './InterventionInfo'
export { InterventionInfo }

export interface InterventionContentProps {
  headline: string
  infoProps: ComponentProps<typeof InterventionInfo>
  notificationProps?: ComponentProps<typeof InlineNotification>
}

export function InterventionContent({
  headline,
  infoProps,
  notificationProps,
}: InterventionContentProps): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      css={`
        gap: ${SPACING.spacing16};
        width: 100%;
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          gap: ${SPACING.spacing8};
          width: 27rem;
        }
      `}
    >
      <StyledText
        oddStyle="level4HeaderSemiBold"
        desktopStyle="headingSmallBold"
      >
        {headline}
      </StyledText>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        css={`
          gap: ${SPACING.spacing16};
          width: 100%;
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            gap: ${SPACING.spacing24};
          }
        `}
      >
        <InterventionInfo {...infoProps} />
        {notificationProps ? (
          <InlineNotification {...notificationProps} />
        ) : null}
      </Flex>
    </Flex>
  )
}
