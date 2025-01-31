import { css } from 'styled-components'
import { COLORS, BORDERS } from '../../helix-design-system'
import { Flex } from '../../primitives'
import { Icon } from '../../icons'
import {
  ALIGN_CENTER,
  CURSOR_AUTO,
  CURSOR_POINTER,
  DIRECTION_ROW,
  FLEX_MAX_CONTENT,
  JUSTIFY_SPACE_BETWEEN,
} from '../../styles'
import { RESPONSIVENESS, SPACING } from '../../ui-style-constants'
import { StyledText } from '../StyledText'

import type { MouseEventHandler } from 'react'

export interface CheckboxProps {
  /** checkbox is checked if value is true */
  isChecked: boolean
  /** label text that describes the option */
  labelText: string
  /** callback click/tap handler */
  onClick: MouseEventHandler
  /** html tabindex property */
  tabIndex?: number
  /** if disabled is true, mouse events will not trigger onClick callback */
  disabled?: boolean
  /** optional borderRadius type */
  type?: 'round' | 'neutral'
  /** optional width for helix */
  width?: string
}
export function Checkbox(props: CheckboxProps): JSX.Element {
  const {
    isChecked,
    labelText,
    onClick,
    tabIndex = 0,
    disabled = false,
    width = FLEX_MAX_CONTENT,
    type = 'round',
  } = props

  const CHECKBOX_STYLE = css`
    width: ${width};
    grid-gap: ${SPACING.spacing12};
    border: none;
    align-items: ${ALIGN_CENTER};
    flex-direction: ${DIRECTION_ROW};
    color: ${isChecked ? COLORS.white : COLORS.black90};
    background-color: ${isChecked ? COLORS.blue50 : COLORS.blue30};
    border-radius: ${type === 'round'
      ? BORDERS.borderRadiusFull
      : BORDERS.borderRadius8};
    padding: ${SPACING.spacing12} ${SPACING.spacing16};
    justify-content: ${JUSTIFY_SPACE_BETWEEN};
    cursor: ${CURSOR_POINTER};

    &:active {
      background-color: ${isChecked ? COLORS.blue55 : COLORS.blue40};
    }
    &:focus-visible {
      background-color: ${isChecked ? COLORS.blue50 : COLORS.blue35};
      outline: 3px ${BORDERS.styleSolid} ${COLORS.blue50};
      outline-offset: 2px;
    }
    &:disabled {
      background-color: ${COLORS.grey35};
      color: ${COLORS.grey50};
    }
    &:hover {
      background-color: ${isChecked ? COLORS.blue55 : COLORS.blue35};
    }

    @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
      padding: ${SPACING.spacing20};
      border-radius: ${BORDERS.borderRadius16};
      width: 100%;
      cursor: ${CURSOR_AUTO};
    }
  `

  return (
    <Flex
      as="button"
      role="checkbox"
      onClick={onClick}
      tabIndex={tabIndex}
      disabled={disabled}
      css={CHECKBOX_STYLE}
    >
      <StyledText desktopStyle="bodyDefaultRegular" oddStyle="bodyTextSemiBold">
        {labelText}
      </StyledText>
      <Check isChecked={isChecked} />
    </Flex>
  )
}

interface CheckProps {
  isChecked: boolean
  color?: string
  disabled?: boolean
}
export function Check(props: CheckProps): JSX.Element {
  const { isChecked, color = COLORS.white, disabled = false } = props
  return isChecked ? (
    <Flex css={CHECK_STYLE}>
      <Icon name="ot-checkbox" color={color} />
    </Flex>
  ) : (
    <Flex
      css={CHECK_STYLE}
      border={`2px solid ${disabled ? COLORS.grey40 : COLORS.black90}`}
      borderRadius={BORDERS.borderRadius4}
    />
  )
}

const CHECK_STYLE = css`
  width: 1rem;
  height: 1rem;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: 1.75rem;
    height: 1.75rem;
  }
`
