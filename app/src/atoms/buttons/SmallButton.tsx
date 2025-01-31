import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  CURSOR_DEFAULT,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { ODD_FOCUS_VISIBLE } from './constants'

import type { MouseEventHandler, ReactNode } from 'react'
import type { IconName, StyleProps } from '@opentrons/components'

export type SmallButtonTypes =
  | 'alert'
  | 'primary'
  | 'secondary'
  | 'tertiaryLowLight'
  | 'tertiaryHighLight'

export type ButtonCategory = 'default' | 'rounded'

export type IconPlacement = 'startIcon' | 'endIcon'
interface SmallButtonProps extends StyleProps {
  onClick: MouseEventHandler
  buttonType?: SmallButtonTypes
  buttonText: ReactNode
  iconPlacement?: IconPlacement | null
  iconName?: IconName | null
  buttonCategory?: ButtonCategory // if not specified, it will be 'default'
  disabled?: boolean
  /** aria-disabled for displaying snack bar, used for ODD only at this time. */
  ariaDisabled?: boolean
}

export function SmallButton(props: SmallButtonProps): JSX.Element {
  const {
    buttonType = 'primary',
    buttonText,
    buttonCategory = 'default',
    disabled,
    iconPlacement,
    iconName,
    ariaDisabled = false,
    ...buttonProps
  } = props

  const SMALL_BUTTON_PROPS_BY_TYPE: Record<
    SmallButtonTypes,
    {
      defaultBackgroundColor: string
      activeBackgroundColor: string
      disabledBackgroundColor: string
      disabledColor: string
      defaultColor: string
    }
  > = {
    secondary: {
      defaultColor: COLORS.black90,
      defaultBackgroundColor: COLORS.blue35,
      activeBackgroundColor: COLORS.blue40,
      disabledBackgroundColor: `${COLORS.grey35}`,
      disabledColor: `${COLORS.grey50}`,
    },

    alert: {
      defaultColor: COLORS.white,
      defaultBackgroundColor: COLORS.red50,
      activeBackgroundColor: COLORS.red55,
      disabledBackgroundColor: `${COLORS.grey35}`,
      disabledColor: `${COLORS.grey50}`,
    },

    primary: {
      defaultColor: COLORS.white,
      defaultBackgroundColor: COLORS.blue50,
      activeBackgroundColor: COLORS.blue60,
      disabledBackgroundColor: `${COLORS.grey35}`,
      disabledColor: `${COLORS.grey50}`,
    },

    tertiaryHighLight: {
      defaultColor: COLORS.black90,
      defaultBackgroundColor: `${COLORS.blue50}00`,
      activeBackgroundColor: `${COLORS.grey35}`,
      disabledBackgroundColor: `${COLORS.blue50}00`,
      disabledColor: `${COLORS.grey50}`,
    },

    tertiaryLowLight: {
      defaultColor: `${COLORS.grey60}`,
      defaultBackgroundColor: ` ${COLORS.blue50}00`,
      activeBackgroundColor: `${COLORS.grey35}`,
      disabledBackgroundColor: `${COLORS.blue50}00`,
      disabledColor: `${COLORS.grey50}`,
    },
  }

  const SMALL_BUTTON_STYLE = css`
    color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
      .defaultBackgroundColor};
    cursor: ${CURSOR_DEFAULT};
    border-radius: ${buttonCategory === 'rounded'
      ? BORDERS.borderRadius40
      : BORDERS.borderRadius16};
    box-shadow: none;
    ${TYPOGRAPHY.pSemiBold}

    &:focus {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
      box-shadow: none;
    }
    &:hover {
      border: none;
      box-shadow: none;
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
      color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    }
    &:focus-visible {
      box-shadow: ${ODD_FOCUS_VISIBLE};
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
    }

    &:active {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
    }

    &:disabled {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .disabledBackgroundColor};
      color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor};
    }

    &[aria-disabled='true'] {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .disabledBackgroundColor};
      color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor};
    }
  `

  return (
    <Btn
      css={SMALL_BUTTON_STYLE}
      disabled={ariaDisabled ? false : disabled}
      padding={
        iconPlacement != null
          ? SPACING.spacing16
          : `${SPACING.spacing16} ${SPACING.spacing24}`
      }
      {...buttonProps}
      aria-disabled={ariaDisabled}
    >
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
      >
        {iconPlacement === 'startIcon' && iconName != null ? (
          <Flex
            aria-label={
              iconName === 'ot-spinner' ? 'loading indicator' : iconName
            }
          >
            <Icon
              size="1.75rem"
              marginRight={SPACING.spacing8}
              name={iconName}
              spin={iconName === 'ot-spinner'}
            />
          </Flex>
        ) : null}

        <StyledText
          oddStyle="bodyTextSemiBold"
          desktopStyle="bodyDefaultSemiBold"
        >
          {buttonText}
        </StyledText>
        {iconPlacement === 'endIcon' && iconName != null ? (
          <Flex
            aria-label={
              iconName === 'ot-spinner' ? 'loading indicator' : iconName
            }
          >
            <Icon
              size="1.75rem"
              marginLeft={SPACING.spacing8}
              name={iconName}
              spin={iconName === 'ot-spinner'}
            />
          </Flex>
        ) : null}
      </Flex>
    </Btn>
  )
}
