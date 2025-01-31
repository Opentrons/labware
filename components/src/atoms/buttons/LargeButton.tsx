import { css } from 'styled-components'

import { Btn } from '../../primitives'
import { BORDERS, COLORS } from '../../helix-design-system'
import { RESPONSIVENESS, SPACING, TYPOGRAPHY } from '../../ui-style-constants'
import { StyledText } from '../StyledText'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  CURSOR_DEFAULT,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  JUSTIFY_SPACE_BETWEEN,
} from '../..'
import { Icon } from '../../icons'

import type { ReactNode } from 'react'
import type { StyleProps } from '../../primitives'
import type { IconName } from '../../icons'

type LargeButtonTypes =
  | 'primary'
  | 'secondary'
  | 'alert'
  | 'alertStroke'
  | 'alertAlt'
  | 'stroke'

const LARGE_BUTTON_PROPS_BY_TYPE: Record<
  LargeButtonTypes,
  {
    defaultBackgroundColor: string
    activeBackgroundColor: string
    disabledBackgroundColor: string
    defaultColor: string
    disabledColor: string
    iconColor: string
    disabledIconColor: string
    focusVisibleOutlineColor: string
    focusVisibleBackgroundColor: string
    hoverBackgroundColor?: string
    hoverColor?: string
    activeIconColor?: string
    activeColor?: string
  }
> = {
  secondary: {
    defaultColor: COLORS.black90,
    disabledColor: COLORS.grey50,
    defaultBackgroundColor: COLORS.blue35,
    activeBackgroundColor: COLORS.blue40,
    disabledBackgroundColor: COLORS.grey35,
    iconColor: COLORS.blue50,
    disabledIconColor: COLORS.grey50,
    focusVisibleOutlineColor: COLORS.blue50,
    focusVisibleBackgroundColor: COLORS.blue40,
  },
  alert: {
    defaultColor: COLORS.red60,
    disabledColor: COLORS.grey50,
    defaultBackgroundColor: COLORS.red35,
    activeBackgroundColor: COLORS.red40,
    disabledBackgroundColor: COLORS.grey35,
    iconColor: COLORS.red60,
    disabledIconColor: COLORS.grey50,
    focusVisibleOutlineColor: COLORS.blue50,
    focusVisibleBackgroundColor: COLORS.red40,
  },
  primary: {
    defaultColor: COLORS.white,
    disabledColor: COLORS.grey50,
    defaultBackgroundColor: COLORS.blue50,
    activeBackgroundColor: COLORS.blue60,
    disabledBackgroundColor: COLORS.grey35,
    iconColor: COLORS.white,
    disabledIconColor: COLORS.grey50,
    focusVisibleOutlineColor: COLORS.blue55,
    focusVisibleBackgroundColor: COLORS.blue55,
    hoverBackgroundColor: COLORS.blue55,
    hoverColor: COLORS.white,
  },
  alertStroke: {
    defaultColor: COLORS.white,
    disabledColor: COLORS.grey50,
    activeColor: COLORS.red60,
    defaultBackgroundColor: COLORS.transparent,
    activeBackgroundColor: COLORS.red35,
    disabledBackgroundColor: COLORS.grey35,
    iconColor: COLORS.white,
    disabledIconColor: COLORS.grey50,
    activeIconColor: COLORS.red60,
    focusVisibleOutlineColor: COLORS.blue50,
    focusVisibleBackgroundColor: COLORS.red40,
  },
  alertAlt: {
    defaultColor: COLORS.red50,
    disabledColor: COLORS.grey50,
    defaultBackgroundColor: COLORS.white,
    activeBackgroundColor: COLORS.red35,
    disabledBackgroundColor: COLORS.grey35,
    iconColor: COLORS.red50,
    disabledIconColor: COLORS.grey50,
    activeIconColor: COLORS.red60,
    activeColor: COLORS.red60,
    focusVisibleOutlineColor: COLORS.blue50,
    focusVisibleBackgroundColor: COLORS.red40,
  },
  stroke: {
    defaultColor: COLORS.blue50,
    disabledColor: COLORS.grey50,
    defaultBackgroundColor: COLORS.white,
    activeBackgroundColor: COLORS.white,
    disabledBackgroundColor: COLORS.white,
    iconColor: COLORS.blue50,
    disabledIconColor: COLORS.grey40,
    focusVisibleOutlineColor: COLORS.blue55,
    focusVisibleBackgroundColor: COLORS.blue55,
    hoverBackgroundColor: COLORS.white,
    hoverColor: COLORS.blue55,
  },
}

interface LargeButtonProps extends StyleProps {
  /** used for form submission */
  type?: 'submit'
  onClick?: () => void
  buttonType?: LargeButtonTypes
  buttonText: ReactNode
  iconName?: IconName
  disabled?: boolean
  /** aria-disabled for displaying snack bar. */
  ariaDisabled?: boolean
}

export function LargeButton(props: LargeButtonProps): JSX.Element {
  const {
    buttonType = 'primary',
    buttonText,
    iconName,
    ariaDisabled = false,
    disabled = false,
    type,
    ...buttonProps
  } = props

  const computedDisabled = disabled || ariaDisabled

  const activeColorFor = (
    style: keyof typeof LARGE_BUTTON_PROPS_BY_TYPE
  ): string =>
    LARGE_BUTTON_PROPS_BY_TYPE[style].activeColor != null
      ? `color: ${LARGE_BUTTON_PROPS_BY_TYPE[style].activeColor}`
      : ''
  const activeIconStyle = (
    style: keyof typeof LARGE_BUTTON_PROPS_BY_TYPE
  ): string =>
    LARGE_BUTTON_PROPS_BY_TYPE[style].activeIconColor != null
      ? `color: ${LARGE_BUTTON_PROPS_BY_TYPE[style].activeIconColor}`
      : ''

  // In order to keep button sizes consistent and expected, all large button types need an outline.
  // The outline color is always the same as the background color unless the background color is uniquely different
  // from the outline.
  const computedBorderStyle = (): string => {
    const borderColor = (): string => {
      if (computedDisabled) {
        return LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor
      } else if (buttonType === 'alertStroke') {
        return LARGE_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor
      } else {
        return LARGE_BUTTON_PROPS_BY_TYPE[buttonType].defaultBackgroundColor
      }
    }

    const calculatedBorderRadius =
      buttonType === 'stroke' ? BORDERS.borderRadius2 : BORDERS.borderRadius4

    return `${calculatedBorderRadius} solid ${borderColor()}`
  }

  const LARGE_BUTTON_STYLE = css`
    color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
      .defaultBackgroundColor};
    cursor: ${CURSOR_POINTER};
    padding: ${SPACING.spacing16} ${SPACING.spacing24};
    text-align: ${TYPOGRAPHY.textAlignLeft};
    border-radius: ${BORDERS.borderRadiusFull};
    align-items: ${ALIGN_CENTER};
    border: ${computedBorderStyle()};

    &:active {
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
      ${activeColorFor(buttonType)};
    }
    &:active #btn-icon {
      ${activeIconStyle(buttonType)};
    }

    &:hover {
      color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].hoverColor};
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .hoverBackgroundColor};

      border: ${buttonType === 'stroke'
        ? `2px solid ${COLORS.blue55}`
        : `${computedBorderStyle()}`};
    }

    &:focus-visible {
      outline: 2px solid ${COLORS.blue55};
    }

    &:disabled {
      color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor};
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .disabledBackgroundColor};
      border: none;
    }

    &[aria-disabled='true'] {
      color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor};
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .disabledBackgroundColor};
      border: none;
    }

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      cursor: ${CURSOR_DEFAULT};
      align-items: ${ALIGN_FLEX_START};
      flex-direction: ${DIRECTION_COLUMN};
      border-radius: ${BORDERS.borderRadius16};
      box-shadow: none;
      padding: ${SPACING.spacing24};
      line-height: ${TYPOGRAPHY.lineHeight20};
      gap: ${SPACING.spacing60};

      &:active {
        background-color: ${computedDisabled
          ? LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledBackgroundColor
          : LARGE_BUTTON_PROPS_BY_TYPE[buttonType].activeBackgroundColor};
        ${!computedDisabled && activeColorFor(buttonType)};
        outline: 4px solid
          ${computedDisabled
            ? LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledBackgroundColor
            : LARGE_BUTTON_PROPS_BY_TYPE[buttonType].activeBackgroundColor};
      }

      &:active #btn-icon {
        ${activeIconStyle(buttonType)};
      }

      &:focus-visible {
        background-color: ${computedDisabled
          ? LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledBackgroundColor
          : LARGE_BUTTON_PROPS_BY_TYPE[buttonType].focusVisibleBackgroundColor};
        ${!computedDisabled && activeColorFor(buttonType)};
        padding: calc(${SPACING.spacing24} + ${SPACING.spacing2});
        border: ${computedBorderStyle()};
        outline: ${computedDisabled
          ? 'none'
          : `3px solid
    ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].focusVisibleOutlineColor}`};
        background-clip: padding-box;
        box-shadow: none;
      }

      &:disabled {
        color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor};
        background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
          .disabledBackgroundColor};
      }
    }
  `

  const appliedIconColor = computedDisabled
    ? LARGE_BUTTON_PROPS_BY_TYPE[buttonType].disabledIconColor
    : LARGE_BUTTON_PROPS_BY_TYPE[buttonType].iconColor

  return (
    <Btn
      type={type}
      display={DISPLAY_FLEX}
      css={LARGE_BUTTON_STYLE}
      disabled={ariaDisabled ? false : disabled}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      aria-disabled={ariaDisabled}
      {...buttonProps}
    >
      <StyledText
        oddStyle="level3HeaderSemiBold"
        desktopStyle="bodyLargeSemiBold"
        css={css`
          padding-right: ${iconName != null ? SPACING.spacing8 : '0'};
        `}
      >
        {buttonText}
      </StyledText>
      {iconName != null ? (
        <Icon
          name={iconName}
          aria-label={`${iconName} icon`}
          color={appliedIconColor}
          css={ICON_STYLE}
        />
      ) : null}
    </Btn>
  )
}

const ICON_STYLE = css`
  width: 1.5rem;
  height: 1.5rem;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 5rem;
    height: 5rem;
  }
`
