import { css } from 'styled-components'

import { COLORS, Flex, POSITION_FIXED } from '@opentrons/components'

import type { ComponentProps, MouseEventHandler } from 'react'

const BACKGROUND_OVERLAY_STYLE = css`
  position: ${POSITION_FIXED};
  inset: 0;
  z-index: 4;
  background-color: ${COLORS.black90}${COLORS.opacity60HexCode};
`

export interface BackgroundOverlayProps extends ComponentProps<typeof Flex> {
  //  onClick handler so when you click anywhere in the overlay, the modal/menu closes
  onClick: MouseEventHandler
}

export function BackgroundOverlay(props: BackgroundOverlayProps): JSX.Element {
  const { onClick, ...flexProps } = props

  return (
    <Flex
      aria-label="BackgroundOverlay"
      css={BACKGROUND_OVERLAY_STYLE}
      onClick={onClick}
      {...flexProps}
    />
  )
}
