import styled, { css } from 'styled-components'
import { SPACING } from '../../../ui-style-constants'
import { BORDERS, COLORS } from '../../../helix-design-system'
import { Flex } from '../../../primitives'
import { StyledText } from '../../StyledText'
import { CURSOR_POINTER } from '../../../styles'

import type { ChangeEventHandler, MouseEvent } from 'react'
import type { StyleProps } from '../../../primitives'

interface ListButtonRadioButtonProps extends StyleProps {
  buttonText: string
  buttonValue: string | number
  onChange: ChangeEventHandler<HTMLInputElement>
  setNoHover?: () => void
  setHovered?: () => void
  disabled?: boolean
  isSelected?: boolean
  id?: string
}

//  used for helix and as a child button to ListButtonAccordion
export function ListButtonRadioButton(
  props: ListButtonRadioButtonProps
): JSX.Element {
  const {
    buttonText,
    buttonValue,
    isSelected = false,
    onChange,
    disabled = false,
    setHovered,
    setNoHover,
    id = buttonText,
  } = props

  return (
    <Flex
      width="100%"
      margin={SPACING.spacing4}
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
      }}
    >
      <SettingButton
        checked={isSelected}
        id={id}
        disabled={disabled}
        onChange={onChange}
        type="radio"
        value={buttonValue}
      />
      <SettingButtonLabel
        role="label"
        isSelected={isSelected}
        disabled={disabled}
        htmlFor={id}
        onMouseEnter={setHovered}
        onMouseLeave={setNoHover}
      >
        <StyledText desktopStyle="bodyDefaultRegular">{buttonText}</StyledText>
      </SettingButtonLabel>
    </Flex>
  )
}

const SettingButton = styled.input`
  display: none;
`

const AVAILABLE_BUTTON_STYLE = css`
  background: ${COLORS.white};
  color: ${COLORS.black90};

  &:hover {
    background-color: ${COLORS.grey10};
  }
`

const SELECTED_BUTTON_STYLE = css`
  background: ${COLORS.blue50};
  color: ${COLORS.white};

  &:active {
    background-color: ${COLORS.blue60};
  }
`

const DISABLED_STYLE = css`
  color: ${COLORS.grey40};
  background-color: ${COLORS.grey10};
`

interface ButtonLabelProps {
  isSelected: boolean
  disabled: boolean
}

const SettingButtonLabel = styled.label<ButtonLabelProps>`
  border-radius: ${BORDERS.borderRadius8};
  cursor: ${CURSOR_POINTER};
  padding: 14px ${SPACING.spacing12};
  width: 100%;

  ${({ isSelected }) =>
    isSelected ? SELECTED_BUTTON_STYLE : AVAILABLE_BUTTON_STYLE}
  ${({ disabled }) => disabled && DISABLED_STYLE}
`
