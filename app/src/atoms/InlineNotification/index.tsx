import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_FLEX_START,
  JUSTIFY_FLEX_END,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  RESPONSIVENESS,
  Link,
} from '@opentrons/components'

import type { MouseEventHandler } from 'react'
import type { IconProps, StyleProps } from '@opentrons/components'

type InlineNotificationType = 'alert' | 'error' | 'neutral' | 'success'

export interface InlineNotificationProps extends StyleProps {
  /** name constant of the icon to display */
  type: InlineNotificationType
  /** InlineNotification contents */
  heading: string
  message?: string
  /** Optional dynamic width based on contents */
  hug?: boolean
  /** optional handler to show close button/clear alert  */
  onCloseClick?: (() => void) | MouseEventHandler<HTMLButtonElement>
  linkText?: string
  onLinkClick?: (() => void) | MouseEventHandler<HTMLButtonElement>
}

const INLINE_NOTIFICATION_PROPS_BY_TYPE: Record<
  InlineNotificationType,
  { icon: IconProps; backgroundColor: string; color: string }
> = {
  alert: {
    icon: { name: 'ot-alert' },
    backgroundColor: COLORS.yellow30,
    color: COLORS.yellow60,
  },
  error: {
    icon: { name: 'ot-alert' },
    backgroundColor: COLORS.red30,
    color: COLORS.red60,
  },
  neutral: {
    icon: { name: 'information' },
    backgroundColor: COLORS.blue30,
    color: COLORS.blue60,
  },
  success: {
    icon: { name: 'ot-check' },
    backgroundColor: COLORS.green30,
    color: COLORS.green60,
  },
}

export function InlineNotification(
  props: InlineNotificationProps
): JSX.Element {
  const {
    heading,
    hug = false,
    onCloseClick,
    message,
    type,
    linkText,
    onLinkClick,
  } = props
  const fullHeading = `${heading}${message ? '. ' : ''}`
  const fullmessage = `${message}.`
  const inlineNotificationProps = INLINE_NOTIFICATION_PROPS_BY_TYPE[type]
  const iconProps = {
    ...inlineNotificationProps.icon,
    color: INLINE_NOTIFICATION_PROPS_BY_TYPE[type].color,
    size: '100%',
  }
  return (
    <Flex
      alignItems={ALIGN_CENTER}
      backgroundColor={INLINE_NOTIFICATION_PROPS_BY_TYPE[type].backgroundColor}
      data-testid={`InlineNotification_${type}`}
      flexDirection={DIRECTION_ROW}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      width={hug ? 'max-content' : '100%'}
      css={css`
        gap: ${SPACING.spacing8};
        border-radius: ${BORDERS.borderRadius4};
        padding: ${SPACING.spacing8} ${SPACING.spacing12};
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          gap: ${SPACING.spacing12};
          border-radius: ${BORDERS.borderRadius8};
          padding: ${SPACING.spacing12} ${SPACING.spacing16};
        }
      `}
    >
      <Flex
        justifyContent={JUSTIFY_FLEX_START}
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_ROW}
        css={css`
          gap: ${SPACING.spacing8};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            gap: ${SPACING.spacing12};
          }
        `}
      >
        <Box
          css={css`
            width: ${SPACING.spacing16};
            height: ${SPACING.spacing16};
            @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
              width: 1.75rem;
              height: 1.75rem;
            }
          `}
        >
          <Icon {...iconProps} aria-label={`icon_${type}`} />
        </Box>
        <Flex flex="1" alignItems={ALIGN_CENTER}>
          <StyledText
            oddStyle="bodyTextRegular"
            desktopStyle="bodyDefaultRegular"
          >
            <span
              css={`
                font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
              `}
            >
              {fullHeading}
            </span>
            {/* this break is because the desktop wants this on two lines, but also wants/
              inline text layout on ODD. Soooo here you go */}
            <br
              css={`
                @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                  display: none;
                }
              `}
            />
            {message != null && fullmessage}
          </StyledText>
        </Flex>
      </Flex>
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_FLEX_END}
        gap={SPACING.spacing16}
      >
        {linkText && (
          <Link onClick={onLinkClick}>
            <StyledText
              oddStyle="bodyTextRegular"
              desktopStyle="bodyDefaultRegular"
              textDecoration="underline"
            >
              {linkText}{' '}
            </StyledText>
          </Link>
        )}
        {onCloseClick && (
          <Btn
            data-testid="InlineNotification_close-button"
            onClick={onCloseClick}
            css={css`
              width: 28px;
              height: 28px;
              @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                width: ${SPACING.spacing48};
                height: ${SPACING.spacing48};
              }
            `}
            width=""
            height="fit-content"
          >
            <Icon
              aria-label="close_icon"
              name="close"
              css={css`
                width: 28px;
                height: 28px;
                @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                  width: ${SPACING.spacing48};
                  height: ${SPACING.spacing48};
                }
              `}
            />
          </Btn>
        )}
      </Flex>
    </Flex>
  )
}
