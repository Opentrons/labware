import styled, { css } from 'styled-components'
import { Flex } from '../../primitives'
import { COLORS, BORDERS } from '../../helix-design-system'
import { RESPONSIVENESS, SPACING } from '../../ui-style-constants'
import {
  CURSOR_DEFAULT,
  CURSOR_POINTER,
  CURSOR_NOT_ALLOWED,
  DIRECTION_ROW,
  ALIGN_CENTER,
  Icon,
  StyledText,
} from '../../index'

import type { ChangeEventHandler, ReactNode } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'
import type { IconName } from '../../icons'
import type { StyleProps } from '../../primitives'

interface RadioButtonProps extends StyleProps {
  buttonLabel: string | ReactNode
  buttonValue: string | number
  onChange: ChangeEventHandler<HTMLInputElement>
  disabled?: boolean
  iconName?: IconName
  isSelected?: boolean
  largeDesktopBorderRadius?: boolean
  radioButtonType?: 'large' | 'small'
  subButtonLabel?: string
  id?: string
  maxLines?: number
  //  used for mouseEnter and mouseLeave
  setNoHover?: () => void
  setHovered?: () => void
  // TODO wire up the error state for the radio button
  error?: string | null
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
    maxLines = 1,
    setHovered,
    setNoHover,
  } = props
  const isLarge = radioButtonType === 'large'

  const AVAILABLE_BUTTON_STYLE = css`
    background: ${COLORS.blue35};

    &:hover,
    &:active {
      background-color: ${disabled ? COLORS.grey35 : COLORS.blue40};
    }
  `

  const SELECTED_BUTTON_STYLE = css`
    background: ${COLORS.blue50};
    color: ${COLORS.white};

    &:hover,
    &:active {
      background-color: ${disabled ? COLORS.grey35 : COLORS.blue60};
    }
  `

  const SUBBUTTON_LABEL_STYLE = css`
    color: ${disabled
      ? COLORS.grey50
      : isSelected
      ? COLORS.white
      : COLORS.grey60};
  `

  const getButtonStyle = (
    isSelected: boolean,
    disabled: boolean
  ): FlattenSimpleInterpolation => {
    if (disabled) return DISABLED_BUTTON_STYLE
    if (isSelected) return SELECTED_BUTTON_STYLE
    return AVAILABLE_BUTTON_STYLE
  }

  return (
    <Flex
      css={css`
        width: ${props.width ?? 'auto'};

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
      <SettingButtonLabel
        tabIndex={0}
        isLarge={isLarge}
        maxLines={maxLines}
        largeDesktopBorderRadius={largeDesktopBorderRadius}
        disabled={disabled}
        isSelected={isSelected}
        role="label"
        htmlFor={id}
        onMouseEnter={setHovered}
        onMouseLeave={setNoHover}
        css={getButtonStyle(isSelected, disabled)}
      >
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
              desktopStyle={
                isLarge ? 'bodyDefaultSemiBold' : 'bodyDefaultRegular'
              }
            >
              {buttonLabel}
            </StyledText>
          ) : (
            buttonLabel
          )}
        </Flex>
        {subButtonLabel != null ? (
          <Flex css={SUBBUTTON_LABEL_STYLE}>
            <StyledText
              oddStyle={isLarge ? 'level4HeaderRegular' : 'bodyTextRegular'}
              desktopStyle="bodyDefaultRegular"
            >
              {subButtonLabel}
            </StyledText>
          </Flex>
        ) : null}
      </SettingButtonLabel>
    </Flex>
  )
}

const DISABLED_BUTTON_STYLE = css`
  background-color: ${COLORS.grey35};
  color: ${COLORS.grey50};

  &:hover,
  &:active {
    background-color: ${COLORS.grey35};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: ${CURSOR_NOT_ALLOWED};
  }
`

const SettingButton = styled.input`
  display: none;
`

interface SettingsButtonLabelProps {
  isSelected: boolean
  disabled: boolean
  largeDesktopBorderRadius: boolean
  isLarge: boolean
  maxLines?: number | null
}

const SettingButtonLabel = styled.label<SettingsButtonLabelProps>`
  border-radius: ${({ largeDesktopBorderRadius }) =>
    !largeDesktopBorderRadius ? BORDERS.borderRadius40 : BORDERS.borderRadius8};
  cursor: ${CURSOR_POINTER};
  padding: ${SPACING.spacing12} ${SPACING.spacing16};
  width: 100%;

  ${({ disabled }) => disabled && DISABLED_BUTTON_STYLE}
  &:focus-visible {
    outline: 2px solid ${COLORS.blue55};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    cursor: ${CURSOR_DEFAULT};
    padding: ${({ largeDesktopBorderRadius }) =>
      largeDesktopBorderRadius ? SPACING.spacing24 : SPACING.spacing20};
    border-radius: ${BORDERS.borderRadius16};
    display: ${({ maxLines }) => (maxLines != null ? '-webkit-box' : 'none')};
    -webkit-line-clamp: ${({ maxLines }) => maxLines ?? 'none'};
    -webkit-box-orient: ${({ maxLines }) =>
      maxLines != null ? 'vertical' : 'none'};
    word-wrap: break-word;
    word-break: break-all;
  }
`
