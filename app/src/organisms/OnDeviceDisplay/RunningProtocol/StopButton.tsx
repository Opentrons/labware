import * as React from 'react'
import { css } from 'styled-components'

import {
  Icon,
  Btn,
  ALIGN_CENTER,
  LEGACY_COLORS,
  JUSTIFY_CENTER,
} from '@opentrons/components'

import { ODD_FOCUS_VISIBLE } from '../../../atoms/buttons/constants'

const STOP_BUTTON_STYLE = css`
  -webkit-tap-highlight-color: transparent;
  display: flex;
  background-color: ${LEGACY_COLORS.red2};
  border-radius: 50%;

  &:focus {
    background-color: ${LEGACY_COLORS.red2Pressed};
    box-shadow: none;
  }
  &:hover {
    border: none;
    box-shadow: none;
    background-color: ${LEGACY_COLORS.red2};
    color: ${COLORS.white};
  }
  &:focus-visible {
    box-shadow: ${ODD_FOCUS_VISIBLE};
    background-color: ${LEGACY_COLORS.red2};
  }
  &:active {
    background-color: ${LEGACY_COLORS.red2};
  }
  &:disabled {
    background-color: ${COLORS.grey35};
    color: ${COLORS.grey50};
  }
`

interface StopButtonProps {
  onStop?: () => void
  /** default size 12.5rem */
  buttonSize?: string
  /** default size 5rem */
  iconSize?: string
}
export function StopButton({
  onStop,
  buttonSize = '12.5rem',
  iconSize = '5rem',
}: StopButtonProps): JSX.Element {
  return (
    <Btn
      css={STOP_BUTTON_STYLE}
      height={buttonSize}
      width={buttonSize}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      onClick={onStop}
      aria-label="stop"
    >
      <Icon name="ot-close-thick" color={COLORS.white} size={iconSize} />
    </Btn>
  )
}
