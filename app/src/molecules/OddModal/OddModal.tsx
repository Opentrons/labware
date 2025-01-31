import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import { BackgroundOverlay } from '../BackgroundOverlay'
import { OddModalHeader } from './OddModalHeader'

import type { MouseEvent, MouseEventHandler, ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { OddModalHeaderBaseProps, ModalSize } from './types'

interface OddModalProps extends StyleProps {
  /** clicking anywhere outside of the modal closes it  */
  onOutsideClick?: MouseEventHandler
  /** modal content */
  children: ReactNode
  /** for small, medium, or large modal sizes, medium by default */
  modalSize?: ModalSize
  /** see OddModalHeader component for more details */
  header?: OddModalHeaderBaseProps
}
/**
 * For ODD use only.
 */
export function OddModal(props: OddModalProps): JSX.Element {
  const {
    modalSize = 'medium',
    onOutsideClick,
    children,
    header,
    ...styleProps
  } = props

  let modalWidth: string = '45.625rem'
  switch (modalSize) {
    case 'small': {
      modalWidth = '32.375rem'
      break
    }
    case 'large': {
      modalWidth = '60rem'
      break
    }
  }
  return (
    <BackgroundOverlay
      onClick={e => {
        e.stopPropagation()
        onOutsideClick?.(e)
      }}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
    >
      <Flex
        backgroundColor={COLORS.white}
        width={modalWidth}
        height="max-content"
        maxHeight="36.875rem"
        borderRadius={BORDERS.borderRadius12}
        boxShadow={BORDERS.shadowSmall}
        margin={SPACING.spacing32}
        flexDirection={DIRECTION_COLUMN}
        aria-label={`modal_${modalSize}`}
        onClick={(e: MouseEvent) => {
          e.stopPropagation()
        }}
      >
        {header != null ? (
          <OddModalHeader {...header} onClick={onOutsideClick} />
        ) : null}
        <Flex
          backgroundColor={COLORS.white}
          paddingX={SPACING.spacing32}
          paddingBottom={SPACING.spacing32}
          paddingTop={header != null ? '0rem' : SPACING.spacing32}
          borderRadius={
            header != null
              ? `0px 0px ${BORDERS.borderRadius12} ${BORDERS.borderRadius12}`
              : BORDERS.borderRadius12
          }
          maxHeight="30.625rem"
          {...styleProps}
        >
          {children}
        </Flex>
      </Flex>
    </BackgroundOverlay>
  )
}
