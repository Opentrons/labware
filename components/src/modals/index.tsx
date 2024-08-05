import * as React from 'react'
import { Box } from '../primitives'
import { SPACING } from '../ui-style-constants'
import { COLORS } from '../helix-design-system'
import { ModalHeader } from './ModalHeader'
import { ModalShell } from './ModalShell'
import type { IconProps } from '../icons'
import type { StyleProps } from '../primitives'

type ModalType = 'info' | 'warning' | 'error'

// modal components
export * from './AlertModal'
export * from './ContinueModal'
export * from './LegacyModal'
export * from './Overlay'
export * from './SpinnerModal'
export * from './SpinnerModalPage'
export * from './ModalShell'
export * from './ModalHeader'

export interface ModalProps extends StyleProps {
  type?: ModalType
  onClose?: React.MouseEventHandler
  closeOnOutsideClick?: boolean
  title?: React.ReactNode
  fullPage?: boolean
  childrenPadding?: string | number
  children?: React.ReactNode
  footer?: React.ReactNode
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
      icon={['error', 'warning'].includes(type) ? modalIcon : undefined}
      color={COLORS.black90}
      backgroundColor={COLORS.white}
    />
  )

  return (
    <ModalShell
      width={styleProps.width ?? '31.25rem'}
      header={modalHeader}
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
