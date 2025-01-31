import { BORDERS, COLORS } from '../../helix-design-system'
import {
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
  POSITION_ABSOLUTE,
} from '../../styles'
import { Flex } from '../../primitives'
import { SPACING } from '../../ui-style-constants'
import { ModalShell } from '../../modals'

import type { MouseEventHandler, ReactNode } from 'react'

interface MenuListProps {
  children: ReactNode
  isOnDevice?: boolean
  onClick?: MouseEventHandler
}

export const MenuList = (props: MenuListProps): JSX.Element | null => {
  const { children, isOnDevice = false, onClick = null } = props
  return isOnDevice && onClick != null ? (
    <ModalShell
      borderRadius={BORDERS.borderRadius16}
      width="max-content"
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
      borderRadius="4px 4px 0px 0px"
      zIndex={10}
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
      position={POSITION_ABSOLUTE}
      backgroundColor={COLORS.white}
      top="2.6rem"
      right={`calc(50% + ${SPACING.spacing4})`}
      flexDirection={DIRECTION_COLUMN}
      width="max-content"
    >
      {children}
    </Flex>
  )
}
