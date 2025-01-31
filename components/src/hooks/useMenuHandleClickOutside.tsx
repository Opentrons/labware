import { useState } from 'react'
import { COLORS } from '../helix-design-system'
import { Overlay } from '../modals'

import type { Dispatch, MouseEventHandler, SetStateAction } from 'react'

interface MenuHandleClickOutside {
  menuOverlay: JSX.Element
  handleOverflowClick: MouseEventHandler<HTMLButtonElement>
  showOverflowMenu: boolean
  setShowOverflowMenu: Dispatch<SetStateAction<boolean>>
}

export function useMenuHandleClickOutside(): MenuHandleClickOutside {
  const [showOverflowMenu, setShowOverflowMenu] = useState<boolean>(false)

  const handleOverflowClick: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setShowOverflowMenu(currentShowOverflowMenu => !currentShowOverflowMenu)
  }

  const handleClickOutside: MouseEventHandler<HTMLDivElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    setShowOverflowMenu(false)
  }

  const menuOverlay: JSX.Element = (
    <>
      {showOverflowMenu ? (
        <Overlay
          onClick={handleClickOutside}
          backgroundColor={COLORS.transparent}
        />
      ) : null}
    </>
  )

  return {
    menuOverlay,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  }
}
