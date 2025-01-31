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
  POSITION_FIXED,
  SPACING,
  StyledText,
} from '@opentrons/components'

import type { ComponentProps } from 'react'
import type { IconName } from '@opentrons/components'

interface FloatingActionButtonProps extends ComponentProps<typeof Btn> {
  buttonText: string
  disabled?: boolean
  iconName?: IconName
}

export function FloatingActionButton(
  props: FloatingActionButtonProps
): JSX.Element {
  const { buttonText, disabled = false, iconName, ...buttonProps } = props

  const contentColor = disabled ? COLORS.grey50 : COLORS.white
  const FLOATING_ACTION_BUTTON_STYLE = css`
    background-color: ${COLORS.purple50};
    border-radius: ${BORDERS.borderRadius40};
    box-shadow: ${BORDERS.shadowBig};
    color: ${contentColor};
    cursor: ${CURSOR_DEFAULT};

    &:active {
      background-color: ${COLORS.purple55};
    }

    &:focus-visible {
      border-color: ${COLORS.blue50};
      border-width: ${SPACING.spacing4};
      box-shadow: ${BORDERS.shadowBig};
    }

    &:disabled {
      background-color: ${COLORS.grey35};
      color: ${contentColor};
    }
  `

  return (
    <Btn
      bottom={SPACING.spacing24}
      css={FLOATING_ACTION_BUTTON_STYLE}
      disabled={disabled}
      padding={`${SPACING.spacing12} ${SPACING.spacing24}`}
      position={POSITION_FIXED}
      right={SPACING.spacing24}
      {...buttonProps}
    >
      <Flex
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_ROW}
        gridGap={SPACING.spacing8}
      >
        {iconName != null ? (
          <Icon
            color={contentColor}
            height="3rem"
            name={iconName}
            width="3.75rem"
          />
        ) : null}
        <StyledText oddStyle="level4HeaderSemiBold">{buttonText}</StyledText>
      </Flex>
    </Btn>
  )
}
