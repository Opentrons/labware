import { css } from 'styled-components'
import { Btn, Flex } from '../../primitives'
import { Icon } from '../../icons'
import { BORDERS, COLORS } from '../../helix-design-system'
import { RESPONSIVENESS, SPACING, TYPOGRAPHY } from '../../ui-style-constants'
import {
  ALIGN_CENTER,
  DIRECTION_ROW,
  JUSTIFY_SPACE_BETWEEN,
} from '../../styles'

import type { MouseEvent, MouseEventHandler, ReactNode } from 'react'
import type { StyleProps } from '../../primitives'
import type { IconProps } from '../../icons'

export type BannerType =
  | 'success'
  | 'warning'
  | 'error'
  | 'updating'
  | 'informing'

export interface BannerProps extends StyleProps {
  /** name constant of the icon to display */
  type: BannerType
  /** Banner contents */
  children?: ReactNode
  /** optional handler to show close button/clear alert  */
  onCloseClick?: (() => void) | MouseEventHandler<HTMLButtonElement>
  /** Override the default Alert Icon */
  icon?: IconProps
  /** some banner onCloseClicks fire events, this allows a spinner after click but before event finishes */
  isCloseActionLoading?: boolean
  /** Override the Exit icon */
  closeButton?: ReactNode
  /** Icon margin right for large banners */
  iconMarginRight?: string
  /** Icon margin left for large banners */
  iconMarginLeft?: string
}

const BANNER_PROPS_BY_TYPE: Record<
  BannerType,
  { icon: IconProps; backgroundColor: string; color: string }
> = {
  success: {
    icon: { name: 'check-circle' },
    backgroundColor: COLORS.green30,
    color: COLORS.green60,
  },
  error: {
    icon: { name: 'alert-circle' },
    backgroundColor: COLORS.red30,
    color: COLORS.red60,
  },
  warning: {
    icon: { name: 'alert-circle' },
    backgroundColor: COLORS.yellow30,
    color: COLORS.yellow60,
  },
  updating: {
    icon: { name: 'ot-spinner' },
    backgroundColor: COLORS.grey30,
    color: COLORS.grey60,
  },
  informing: {
    icon: { name: 'information' },
    backgroundColor: COLORS.blue30,
    color: COLORS.blue60,
  },
}

export function Banner(props: BannerProps): JSX.Element {
  const {
    type,
    onCloseClick,
    icon,
    children,
    isCloseActionLoading = false,
    padding,
    closeButton,
    iconMarginLeft,
    iconMarginRight,
    size,
    ...styleProps
  } = props
  const bannerProps = BANNER_PROPS_BY_TYPE[type]
  const iconProps = {
    ...(icon ?? bannerProps.icon),
    size: size ?? '1rem',
    marginRight: iconMarginRight ?? SPACING.spacing8,
    marginLeft: iconMarginLeft ?? '0rem',
    color: BANNER_PROPS_BY_TYPE[type].color,
  }
  const BANNER_STYLE = css`
    font-size: ${TYPOGRAPHY.fontSizeP};
    font-weight: ${TYPOGRAPHY.fontWeightRegular};
    border-radius: ${SPACING.spacing4};

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      font-size: 1.25rem;
      font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
      background-color: ${COLORS.yellow35};
      border-radius: ${BORDERS.borderRadius12};
      line-height: 1.5rem;
    }
  `
  return (
    <Flex
      backgroundColor={BANNER_PROPS_BY_TYPE[type].backgroundColor}
      css={BANNER_STYLE}
      flexDirection={DIRECTION_ROW}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      padding={padding ?? SPACING.spacing8}
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
      }}
      data-testid={`Banner_${type}`}
      {...styleProps}
    >
      <Icon
        {...iconProps}
        aria-label={`icon_${type}`}
        spin={BANNER_PROPS_BY_TYPE[type].icon.name === 'ot-spinner'}
      />
      <Flex flex="1" alignItems={ALIGN_CENTER}>
        {props.children}
      </Flex>
      {onCloseClick != null && !(isCloseActionLoading ?? false) ? (
        <Btn data-testid="Banner_close-button" onClick={props.onCloseClick}>
          {closeButton ?? (
            <Icon
              width={SPACING.spacing24}
              height={SPACING.spacing24}
              marginTop={SPACING.spacing6}
              name="close"
              aria-label="close_icon"
            />
          )}
        </Btn>
      ) : null}
      {(isCloseActionLoading ?? false) && (
        <Icon name="ot-spinner" size="1rem" aria-label="ot-spinner" spin />
      )}
    </Flex>
  )
}
