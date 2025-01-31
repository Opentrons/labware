import styled from 'styled-components'
import {
  ALIGN_CENTER,
  ALIGN_END,
  CURSOR_DEFAULT,
  JUSTIFY_CENTER,
  JUSTIFY_END,
  OVERFLOW_AUTO,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  POSITION_STICKY,
} from '../styles'
import { BORDERS, COLORS } from '../helix-design-system'
import { RESPONSIVENESS, SPACING } from '../ui-style-constants'
import { styleProps } from '../primitives'

import type { MouseEvent, MouseEventHandler, ReactNode } from 'react'
import type { StyleProps } from '../primitives'

export type Position = 'center' | 'bottomRight'
export interface ModalShellProps extends StyleProps {
  /** Modal content */
  children: ReactNode
  /** Optional close on outside click **/
  onOutsideClick?: MouseEventHandler
  /** Optional sticky header */
  header?: ReactNode
  /** Optional sticky footer */
  footer?: ReactNode
  /** Optional full page takeover */
  fullPage?: boolean
  /** Optional zIndex for the overlay */
  zIndexOverlay?: number
  /** Optional position to make the modal appear at the center or bottom right */
  position?: Position
  /** Optional visible overlay */
  showOverlay?: boolean
  /** Optional remove padding */
  noPadding?: boolean
}

/**
 * A ModalShell is a layout component for building more specific modals.
 *
 * It includes:
 * - An overlay
 * - A content area, with `overflow-y: auto` and customizable with style props
 * - An optional sticky header
 * - An optional sticky footer
 * - An optional onOutsideClick function
 */
export function ModalShell(props: ModalShellProps): JSX.Element {
  const {
    onOutsideClick,
    zIndex = 10,
    header,
    footer,
    fullPage = false,
    children,
    zIndexOverlay = 1,
    position = 'center',
    showOverlay = true,
    noPadding = false,
    ...styleProps
  } = props

  return (
    <Overlay
      showOverlay={showOverlay}
      zIndex={zIndexOverlay}
      aria-label="BackgroundOverlay_ModalShell"
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
        if (onOutsideClick != null) onOutsideClick(e)
      }}
    >
      <ContentArea zIndex={zIndex} position={position} noPadding={noPadding}>
        <ModalArea
          aria-label="ModalShell_ModalArea"
          isFullPage={fullPage}
          onClick={(e: MouseEvent) => {
            e.stopPropagation()
          }}
          {...styleProps}
        >
          {header != null ? <Header>{header}</Header> : null}
          {children}
          {footer != null ? <Footer>{footer}</Footer> : null}
        </ModalArea>
      </ContentArea>
    </Overlay>
  )
}
const Overlay = styled.div<{ zIndex: string | number; showOverlay: boolean }>`
  position: ${POSITION_ABSOLUTE};
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: ${({ zIndex }) => zIndex};
  background-color: ${({ showOverlay }) =>
    showOverlay
      ? `${COLORS.black90}${COLORS.opacity40HexCode}`
      : COLORS.transparent};
  cursor: ${CURSOR_DEFAULT};
`

const ContentArea = styled.div<{
  zIndex: string | number
  position: Position
  noPadding: boolean
}>`
  display: flex;
  position: ${POSITION_ABSOLUTE};
  align-items: ${({ position }) =>
    position === 'center' ? ALIGN_CENTER : ALIGN_END};
  justify-content: ${({ position }) =>
    position === 'center' ? JUSTIFY_CENTER : JUSTIFY_END};
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: ${({ zIndex }) => zIndex};
  padding: ${({ noPadding }) => (noPadding ? 0 : SPACING.spacing16)};
`

const ModalArea = styled.div<
  { isFullPage: boolean; backgroundColor?: string } & StyleProps
>`
  position: ${POSITION_RELATIVE};
  overflow-y: ${OVERFLOW_AUTO};
  max-height: 100%;
  width: 100%;
  border-radius: ${BORDERS.borderRadius8};
  box-shadow: ${BORDERS.smallDropShadow};
  height: ${({ isFullPage }) => (isFullPage ? '100%' : 'auto')};
  background-color: ${COLORS.white};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-radius: ${BORDERS.borderRadius16};
  }
  ${styleProps};
`

const Footer = styled.div`
  background-color: ${COLORS.white};
  position: ${POSITION_STICKY};
  bottom: 0;
`
const Header = styled.div`
  background-color: ${COLORS.white};
  position: ${POSITION_STICKY};
  top: 0;
`
