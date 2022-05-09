import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import {
  Flex,
  COLORS,
  POSITION_ABSOLUTE,
  DIRECTION_COLUMN,
  POSITION_RELATIVE,
  ALIGN_FLEX_END,
  SIZE_4,
  Overlay,
} from '@opentrons/components'
import { Portal } from '../../App/portal'
import { OverflowBtn } from '../../atoms/MenuList/OverflowBtn'
import { MenuItem } from '../../atoms/MenuList/MenuItem'
import {
  analyzeProtocol,
  viewProtocolSourceFolder,
} from '../../redux/protocol-storage'

import type { Dispatch } from '../../redux/types'

interface OverflowMenuProps {
  protocolKey: string
}

export function OverflowMenu(props: OverflowMenuProps): JSX.Element {
  const { protocolKey } = props
  const { t } = useTranslation('protocol_details')
  const [showOverflowMenu, setShowOverflowMenu] = React.useState<boolean>(false)
  const dispatch = useDispatch<Dispatch>()

  const handleClickShowInFolder: React.MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    dispatch(viewProtocolSourceFolder(protocolKey))
    setShowOverflowMenu(!showOverflowMenu)
  }
  const handleClickReanalyze: React.MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    dispatch(analyzeProtocol(protocolKey))
    setShowOverflowMenu(!showOverflowMenu)
  }
  const handleOverflowClick: React.MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    setShowOverflowMenu(!showOverflowMenu)
  }

  const handleClickOutside: React.MouseEventHandler<HTMLDivElement> = e => {
    e.preventDefault()
    setShowOverflowMenu(false)
  }
  return (
    <Flex flexDirection={DIRECTION_COLUMN} position={POSITION_RELATIVE}>
      <OverflowBtn alignSelf={ALIGN_FLEX_END} onClick={handleOverflowClick} />
      {showOverflowMenu ? (
        <Flex
          width={SIZE_4}
          zIndex={10}
          borderRadius={'4px 4px 0px 0px'}
          boxShadow={'0px 1px 3px rgba(0, 0, 0, 0.2)'}
          position={POSITION_ABSOLUTE}
          backgroundColor={COLORS.white}
          top="3rem"
          right={0}
          flexDirection={DIRECTION_COLUMN}
        >
          <MenuItem onClick={handleClickShowInFolder}>
            {t('show_in_folder')}
          </MenuItem>
          <MenuItem onClick={handleClickReanalyze}>{t('reanalyze')}</MenuItem>
        </Flex>
      ) : null}
      <Portal level="top">
        {showOverflowMenu ? (
          <Overlay
            onClick={handleClickOutside}
            backgroundColor={COLORS.transparent}
          />
        ) : null}
      </Portal>
    </Flex>
  )
}
