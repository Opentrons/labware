import * as React from 'react'
import styled, { css } from 'styled-components'
import { Flex } from '../../primitives'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_ROW,
  Icon,
  RESPONSIVENESS,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '../..'
import type { IconName } from '../..'
import type { StyleProps } from '../../primitives'

interface RadioButtonProps extends StyleProps {
  buttonLabel: string | React.ReactNode
  buttonValue: string | number
  onChange: React.ChangeEventHandler<HTMLInputElement>
  disabled?: boolean
  iconName?: IconName
  id?: string
  isSelected?: boolean
  largeDesktopBorderRadius?: boolean
  maxLines?: number | null
  radioButtonType?: 'large' | 'small'
  subButtonLabel?: string
}

//  used for ODD and helix
export function RadioButton(props: RadioButtonProps): JSX.Element {
  const {
    buttonLabel,
    buttonValue,
    disabled = false,
    isSelected = false,
    onChange,
    radioButtonType = 'large',
    subButtonLabel,
    id = typeof buttonLabel === 'string'
      ? buttonLabel
      : `RadioButtonId_${buttonValue}`,
    largeDesktopBorderRadius = false,
    iconName,
    maxLines = null,
  } = props

  const isLarge = radioButtonType === 'large'

  const SettingButton = styled.input`
    display: none;
  `

  const AVAILABLE_BUTTON_STYLE = css`
    background: ${COLORS.blue35};

    &:hover,
    &:active {
      background-color: ${COLORS.blue40};
    }
  `

  const SELECTED_BUTTON_STYLE = css`
    background: ${COLORS.blue50};
    color: ${COLORS.white};

    &:hover,
    &:active {
      background-color: ${COLORS.blue55};
    }
  `

  const DISABLED_BUTTON_STYLE = css`
    background-color: ${COLORS.grey35};
    color: ${COLORS.grey50};
    cursor: not-allowed;
  `

  const SettingButtonLabel = styled.label`
      border-radius: ${
        !largeDesktopBorderRadius
          ? BORDERS.borderRadius40
          : BORDERS.borderRadius8
      };
      cursor: pointer;
      padding: ${SPACING.spacing12} ${SPACING.spacing16};
      width: 100%;

      ${isSelected ? SELECTED_BUTTON_STYLE : AVAILABLE_BUTTON_STYLE}
      ${disabled && DISABLED_BUTTON_STYLE}

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
       cursor: default;
       padding: ${isLarge ? SPACING.spacing24 : SPACING.spacing20};
       border-radius: ${BORDERS.borderRadius16};
       display: ${maxLines != null ? '-webkit-box' : undefined};
        -webkit-line-clamp: ${maxLines ?? undefined};
        -webkit-box-orient: ${maxLines != null ? 'vertical' : undefined};
      }
    }
  `

  return (
    <Flex
      css={css`
        width: auto;
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          width: 100%;
        }
      `}
    >
      <SettingButton
        checked={isSelected}
        disabled={disabled}
        id={id}
        onChange={onChange}
        type="radio"
        value={buttonValue}
      />
      <SettingButtonLabel role="label" htmlFor={id}>
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing2}
          alignItems={ALIGN_CENTER}
        >
          {iconName != null ? (
            <Icon
              name={iconName}
              width="1rem"
              height="1rem"
              data-testid={`icon_${iconName}`}
            />
          ) : null}
          {typeof buttonLabel === 'string' ? (
            <StyledText
              oddStyle={isLarge ? 'level4HeaderSemiBold' : 'bodyTextRegular'}
              desktopStyle="bodyDefaultRegular"
            >
              {buttonLabel}
            </StyledText>
          ) : (
            buttonLabel
          )}
        </Flex>
        {subButtonLabel != null ? (
          <StyledText
            oddStyle="level4HeaderRegular"
            fontWeight={TYPOGRAPHY.fontWeightRegular}
          >
            {subButtonLabel}
          </StyledText>
        ) : null}
      </SettingButtonLabel>
    </Flex>
  )
}
