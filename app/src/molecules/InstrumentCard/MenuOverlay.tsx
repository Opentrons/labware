import { Fragment } from 'react'

import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  MenuItem,
  NO_WRAP,
  POSITION_ABSOLUTE,
} from '@opentrons/components'

import { Divider } from '/app/atoms/structure'

import type { MouseEventHandler, MouseEvent, ReactNode } from 'react'
import type { StyleProps } from '@opentrons/components'

export interface MenuOverlayItemProps {
  label: ReactNode
  onClick: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
}

interface MenuOverlayProps extends StyleProps {
  menuOverlayItems: MenuOverlayItemProps[]
  setShowMenuOverlay: (showMenuOverlay: boolean) => void
  hasDivider?: boolean
}

// TODO(bh, 2022-10-31): consider making this a generic molecule if other overflow menus are refactored to use
export function MenuOverlay(props: MenuOverlayProps): JSX.Element {
  const { hasDivider = false, menuOverlayItems, setShowMenuOverlay } = props

  return (
    <Flex
      backgroundColor={COLORS.white}
      borderRadius={BORDERS.borderRadius8}
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
      flexDirection={DIRECTION_COLUMN}
      position={POSITION_ABSOLUTE}
      top="2.25rem"
      right="0"
      whiteSpace={NO_WRAP}
      zIndex={10}
      onClick={(e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setShowMenuOverlay(false)
      }}
    >
      {menuOverlayItems.map((menuOverlayItem, i) => (
        <Fragment key={`menuItem_${i}`}>
          {/* insert a divider before the last item if desired */}
          {hasDivider && i === menuOverlayItems.length - 1 ? (
            <Divider marginY="0" />
          ) : null}
          <MenuItem
            disabled={menuOverlayItem.disabled}
            onClick={menuOverlayItem.onClick}
          >
            {menuOverlayItem.label}
          </MenuItem>
        </Fragment>
      ))}
    </Flex>
  )
}
