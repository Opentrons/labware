import styled from 'styled-components'
import { Flex } from '../../primitives'
import {
  ALIGN_CENTER,
  CURSOR_DEFAULT,
  CURSOR_POINTER,
  FLEX_MAX_CONTENT,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_START,
  SPACING,
  StyledText,
} from '../../index'
import { BORDERS, COLORS } from '../../helix-design-system'
import type { IconName } from '../../index'
interface EmptySelectorButtonProps {
  onClick: () => void
  text: string
  textAlignment: 'left' | 'middle'
  iconName?: IconName
  disabled?: boolean
}

//  used for helix and Opentrons Ai
export function EmptySelectorButton(
  props: EmptySelectorButtonProps
): JSX.Element {
  const { onClick, text, iconName, textAlignment, disabled = false } = props

  return (
    <StyledButton onClick={onClick} disabled={disabled}>
      <Flex
        gridGap={SPACING.spacing4}
        padding={SPACING.spacing12}
        color={disabled ? COLORS.grey40 : COLORS.black90}
        border={`2px dashed ${disabled ? COLORS.grey40 : COLORS.blue50}`}
        borderRadius={BORDERS.borderRadius8}
        width="100%"
        height="100%"
        alignItems={ALIGN_CENTER}
        data-testid="EmptySelectorButton_container"
        justifyContent={
          textAlignment === 'middle' ? JUSTIFY_CENTER : JUSTIFY_START
        }
      >
        {iconName != null ? (
          <Icon
            name={iconName}
            size="1.25rem"
            data-testid={`EmptySelectorButton_${iconName}`}
          />
        ) : null}
        <StyledText desktopStyle="bodyDefaultSemiBold">{text}</StyledText>
      </Flex>
    </StyledButton>
  )
}

interface ButtonProps {
  disabled: boolean
}

const StyledButton = styled.button<ButtonProps>`
  border: none;
  width: ${FLEX_MAX_CONTENT};
  height: ${FLEX_MAX_CONTENT};
  cursor: ${CURSOR_POINTER};
  background-color: ${COLORS.blue30};
  border-radius: ${BORDERS.borderRadius8};

  &:focus-visible {
    outline: 2px solid ${COLORS.white};
    box-shadow: 0 0 0 4px ${COLORS.blue50};
    border-radius: ${BORDERS.borderRadius8};
  }
  &:hover {
    background-color: ${COLORS.blue35};
  }
  &:disabled {
    background-color: ${COLORS.grey20};
    cursor: ${CURSOR_DEFAULT};
  }
`
