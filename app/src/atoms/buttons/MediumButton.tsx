import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  CURSOR_DEFAULT,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  Icon,
  JUSTIFY_CENTER,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { ODD_FOCUS_VISIBLE } from './constants'

import type { MouseEventHandler, ReactNode } from 'react'
import type { IconName, StyleProps } from '@opentrons/components'
import type { ButtonCategory } from './SmallButton'

type MediumButtonTypes =
  | 'primary'
  | 'secondary'
  | 'alert'
  | 'alertSecondary'
  | 'tertiaryHigh'
  | 'tertiaryLowLight'

interface MediumButtonProps extends StyleProps {
  buttonText: ReactNode
  buttonType?: MediumButtonTypes
  disabled?: boolean
  iconName?: IconName
  buttonCategory?: ButtonCategory
  onClick: MouseEventHandler
}

export function MediumButton(props: MediumButtonProps): JSX.Element {
  const {
    buttonText,
    buttonType = 'primary',
    disabled = false,
    iconName,
    buttonCategory = 'default',
    ...buttonProps
  } = props

  const MEDIUM_BUTTON_PROPS_BY_TYPE: Record<
    MediumButtonTypes,
    {
      activeBackgroundColor: string
      defaultBackgroundColor: string
      defaultColor: string
      disabledBackgroundColor: string
      iconColor: string
    }
  > = {
    alert: {
      //  TODO(ew, 3/22/23): replaces these hex codes with the color constants
      activeBackgroundColor: '#b91f20',
      defaultBackgroundColor: COLORS.red50,
      defaultColor: COLORS.white,
      disabledBackgroundColor: COLORS.grey35,
      iconColor: COLORS.white,
    },
    alertSecondary: {
      //  TODO(ew, 3/22/23): replaces these hex codes with the color constants
      activeBackgroundColor: '#ccabac',
      defaultBackgroundColor: COLORS.red35,
      defaultColor: COLORS.red60,
      disabledBackgroundColor: COLORS.grey35,
      iconColor: COLORS.red60,
    },
    primary: {
      //  TODO(ew, 3/22/23): replaces these hex codes with the color constants
      activeBackgroundColor: '#045dd0',
      defaultBackgroundColor: COLORS.blue50,
      defaultColor: COLORS.white,
      disabledBackgroundColor: COLORS.grey35,
      iconColor: COLORS.white,
    },
    secondary: {
      //  TODO(ew, 3/22/23): replaces these hex codes with the color constants
      activeBackgroundColor: '#94afd4',
      defaultBackgroundColor: COLORS.blue35,
      defaultColor: COLORS.black90,
      disabledBackgroundColor: COLORS.grey35,
      iconColor: COLORS.blue50,
    },
    tertiaryHigh: {
      activeBackgroundColor: COLORS.grey35,
      defaultBackgroundColor: COLORS.white,
      defaultColor: COLORS.black90,
      disabledBackgroundColor: COLORS.transparent,
      iconColor: COLORS.black90,
    },
    tertiaryLowLight: {
      activeBackgroundColor: COLORS.grey35,
      defaultBackgroundColor: COLORS.white,
      defaultColor: COLORS.grey60,
      disabledBackgroundColor: COLORS.transparent,
      iconColor: COLORS.grey60,
    },
  }

  const MEDIUM_BUTTON_STYLE = css`
    background-color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType]
      .defaultBackgroundColor};
    border-radius: ${buttonCategory === 'rounded'
      ? BORDERS.borderRadius40
      : BORDERS.borderRadius16};
    box-shadow: none;
    color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    cursor: ${CURSOR_DEFAULT};

    &:focus {
      background-color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
      box-shadow: none;
    }
    &:hover {
      background-color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
      border: none;
      box-shadow: none;
      color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    }
    &:focus-visible {
      box-shadow: ${ODD_FOCUS_VISIBLE};
    }

    &:active {
      background-color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
    }

    &:disabled {
      background-color: ${MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType]
        .disabledBackgroundColor};
      color: ${COLORS.grey50};
    }
  `
  return (
    <Btn
      display={DISPLAY_FLEX}
      disabled={disabled}
      css={MEDIUM_BUTTON_STYLE}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      flexDirection={DIRECTION_ROW}
      gridGap={SPACING.spacing12}
      padding={
        iconName !== undefined
          ? `${SPACING.spacing20} ${SPACING.spacing24}`
          : `${SPACING.spacing20} ${SPACING.spacing40}`
      }
      {...buttonProps}
    >
      {iconName !== undefined && (
        <Icon
          name={iconName ?? 'play'}
          aria-label={`${iconName ?? 'play'} icon`}
          color={
            disabled
              ? COLORS.grey50
              : MEDIUM_BUTTON_PROPS_BY_TYPE[buttonType].iconColor
          }
          size={SPACING.spacing40}
        />
      )}
      <LegacyStyledText
        fontSize={TYPOGRAPHY.fontSize28}
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
        lineHeight={TYPOGRAPHY.lineHeight36}
      >
        {buttonText}
      </LegacyStyledText>
    </Btn>
  )
}
