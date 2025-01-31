import { Box } from '../primitives'
import { SPACING } from '../ui-style-constants'
import { COLORS } from '../helix-design-system'
import { ModalHeader } from './ModalHeader'
import { ModalShell } from './ModalShell'

import type { MouseEventHandler, ReactNode } from 'react'
import type { IconProps } from '../icons'
import type { StyleProps } from '../primitives'
import type { Position } from './ModalShell'

type ModalType = 'info' | 'warning' | 'error'

export interface ModalProps extends StyleProps {
  type?: ModalType
  onClose?: MouseEventHandler
  closeOnOutsideClick?: boolean
  title?: ReactNode
  titleElement1?: JSX.Element
  titleElement2?: JSX.Element
  fullPage?: boolean
  childrenPadding?: string | number
  children?: ReactNode
  footer?: ReactNode
  zIndexOverlay?: number
  showOverlay?: boolean
  position?: Position
  hasHeader?: boolean
}

/**
 * For Desktop app and Helix (which includes Protocol Designer) use only.
 */
export const Modal = (props: ModalProps): JSX.Element => {
  const {
    type = 'info',
    onClose,
    closeOnOutsideClick,
    title,
    childrenPadding = `${SPACING.spacing16} ${SPACING.spacing24} ${SPACING.spacing24}`,
    children,
    footer,
    titleElement1,
    titleElement2,
    zIndexOverlay,
    position,
    showOverlay,
    hasHeader = true,
    ...styleProps
  } = props

  const iconColor = (type: ModalType): string => {
    let iconColor: string = ''
    switch (type) {
      case 'warning':
        iconColor = COLORS.yellow50
        break
      case 'error':
        iconColor = COLORS.red50
        break
    }
    return iconColor
  }

  const modalIcon: IconProps = {
    name: 'ot-alert',
    color: iconColor(type),
    size: '1.25rem',
    marginRight: SPACING.spacing8,
  }

  const modalHeader = (
    <ModalHeader
      onClose={onClose}
      title={title}
      titleElement1={titleElement1}
      titleElement2={titleElement2}
      icon={['error', 'warning'].includes(type) ? modalIcon : undefined}
      color={COLORS.black90}
      backgroundColor={COLORS.white}
    />
  )
  return (
    <ModalShell
      position={position}
      showOverlay={showOverlay}
      zIndexOverlay={zIndexOverlay}
      width={styleProps.width ?? '31.25rem'}
      header={hasHeader ? modalHeader : undefined}
      onOutsideClick={closeOnOutsideClick ?? false ? onClose : undefined}
      // center within viewport aside from nav
      marginLeft={styleProps.marginLeft ?? '5.656rem'}
      {...styleProps}
      footer={footer}
    >
      <Box padding={childrenPadding}>{children}</Box>
    </ModalShell>
  )
}
