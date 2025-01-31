import { Flex, POSITION_FIXED } from '..'

import type { ComponentProps, MouseEventHandler } from 'react'

export interface OverlayProps extends ComponentProps<typeof Flex> {
  /** optional onClick handler */
  onClick?: MouseEventHandler
  alertOverlay?: boolean | null
  backgroundColor?: string
}

export function Overlay(props: OverlayProps): JSX.Element {
  const {
    alertOverlay,
    backgroundColor = 'rgba(0, 0, 0, 0.9)',
    onClick,
    ...flexProps
  } = props

  const alertOverlayBackgroundColor = 'rgba(115, 115, 115, 0.9)'

  return (
    <Flex
      position={POSITION_FIXED}
      left="0"
      right="0"
      top="0"
      bottom="0"
      zIndex="1"
      backgroundColor={
        alertOverlay != null && alertOverlay
          ? alertOverlayBackgroundColor
          : backgroundColor
      }
      onClick={onClick}
      {...flexProps}
    />
  )
}
