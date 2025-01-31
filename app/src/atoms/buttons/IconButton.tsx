import { css } from 'styled-components'
import {
  BORDERS,
  Btn,
  COLORS,
  CURSOR_DEFAULT,
  Icon,
  RESPONSIVENESS,
} from '@opentrons/components'
import { ODD_FOCUS_VISIBLE } from './constants'

import type { ComponentProps } from 'react'

interface IconButtonProps extends ComponentProps<typeof Btn> {
  iconName: ComponentProps<typeof Icon>['name']
  hasBackground?: boolean
}

export function IconButton(props: IconButtonProps): JSX.Element {
  const { iconName, hasBackground = false, ...buttonProps } = props
  return (
    <Btn
      css={css`
        border-radius: ${hasBackground ? BORDERS.borderRadius8 : '50%'};
        max-height: 100%;
        background-color: ${hasBackground ? COLORS.grey35 : COLORS.transparent};

        &:active {
          background-color: ${hasBackground ? COLORS.grey40 : COLORS.grey35};
        }
        &:focus-visible {
          box-shadow: ${ODD_FOCUS_VISIBLE};
          background-color: ${hasBackground
            ? COLORS.grey35
            : COLORS.transparent};
        }
        &:disabled {
          background-color: ${hasBackground
            ? COLORS.grey35
            : COLORS.transparent};
          color: ${COLORS.grey50};
        }
        @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          cursor: ${CURSOR_DEFAULT};
        }
      `}
      {...buttonProps}
    >
      <Icon size="5rem" name={iconName} />
    </Btn>
  )
}
