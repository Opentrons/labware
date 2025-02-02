import { forwardRef } from 'react'
import { BORDERS, COLORS } from '../../helix-design-system'
import {
  DIRECTION_COLUMN,
  FLEX_MAX_CONTENT,
  JUSTIFY_CENTER,
  POSITION_ABSOLUTE,
} from '../../styles'
import { Flex } from '../../primitives'
import { SPACING } from '../../ui-style-constants'
import { ModalShell } from '../../modals'
import type { ForwardedRef, MouseEventHandler, ReactNode } from 'react'
import type { StyleProps } from '../../primitives'

interface MenuListProps extends StyleProps {
  children: ReactNode
  isOnDevice?: boolean
  onClick?: MouseEventHandler
  /** Optional ref - used in PD for overflowY */
  ref?: ForwardedRef<HTMLInputElement>
}

export const MenuList = forwardRef<HTMLDivElement, MenuListProps>(
  (props, ref): JSX.Element => {
    const {
      children,
      isOnDevice = false,
      onClick,
      top = '2.6rem',
      right = `calc(50% + ${SPACING.spacing4})`,
      width = FLEX_MAX_CONTENT,
      zIndex = 10,
      ...restProps
    } = props
    return isOnDevice ? (
      <ModalShell
        borderRadius={BORDERS.borderRadius16}
        width={FLEX_MAX_CONTENT}
        onOutsideClick={onClick}
      >
        <Flex
          boxShadow={BORDERS.shadowSmall}
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_CENTER}
        >
          {children}
        </Flex>
      </ModalShell>
    ) : (
      <Flex
        borderRadius={BORDERS.borderRadius8}
        zIndex={zIndex}
        boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
        position={POSITION_ABSOLUTE}
        backgroundColor={COLORS.white}
        top={top}
        right={right}
        flexDirection={DIRECTION_COLUMN}
        width={width}
        onClick={onClick}
        ref={ref}
        {...restProps}
      >
        {children}
      </Flex>
    )
  }
)
