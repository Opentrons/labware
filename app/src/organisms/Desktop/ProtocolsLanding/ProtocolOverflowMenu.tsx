import { css } from 'styled-components'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import {
  ALIGN_FLEX_END,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  MenuItem,
  NO_WRAP,
  OverflowBtn,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  useConditionalConfirm,
  useMenuHandleClickOutside,
} from '@opentrons/components'
import { FLEX_DISPLAY_NAME, FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { getTopPortalEl } from '/app/App/portal'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
  ANALYTICS_DELETE_PROTOCOL_FROM_APP,
} from '/app/redux/analytics'
import { useFeatureFlag } from '/app/redux/config'
import {
  analyzeProtocol,
  removeProtocol,
  viewProtocolSourceFolder,
} from '/app/redux/protocol-storage'
import { ConfirmDeleteProtocolModal } from './ConfirmDeleteProtocolModal'

import type { MouseEvent, MouseEventHandler } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { StoredProtocolData } from '/app/redux/protocol-storage'
import type { Dispatch } from '/app/redux/types'

interface ProtocolOverflowMenuProps extends StyleProps {
  handleRunProtocol: (storedProtocolData: StoredProtocolData) => void
  handleSendProtocolToFlex: (storedProtocolData: StoredProtocolData) => void
  storedProtocolData: StoredProtocolData
}

export function ProtocolOverflowMenu(
  props: ProtocolOverflowMenuProps
): JSX.Element {
  const {
    storedProtocolData,
    handleRunProtocol,
    handleSendProtocolToFlex,
  } = props
  const { mostRecentAnalysis, protocolKey } = storedProtocolData
  const { t } = useTranslation(['protocol_list', 'shared'])
  const enableProtocolTimeline = useFeatureFlag('protocolTimeline')
  const {
    menuOverlay,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  } = useMenuHandleClickOutside()
  const dispatch = useDispatch<Dispatch>()
  const navigate = useNavigate()
  const trackEvent = useTrackEvent()
  const {
    confirm: confirmDeleteProtocol,
    showConfirmation: showDeleteConfirmation,
    cancel: cancelDeleteProtocol,
  } = useConditionalConfirm(() => {
    dispatch(removeProtocol(protocolKey))
    trackEvent({ name: ANALYTICS_DELETE_PROTOCOL_FROM_APP, properties: {} })
  }, true)

  const robotType =
    mostRecentAnalysis != null ? mostRecentAnalysis?.robotType ?? null : null

  const handleClickShowInFolder: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(viewProtocolSourceFolder(protocolKey))
    setShowOverflowMenu(currentShowOverflowMenu => !currentShowOverflowMenu)
  }
  const handleClickRun: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    trackEvent({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: { sourceLocation: 'ProtocolsLanding' },
    })
    handleRunProtocol(storedProtocolData)
    setShowOverflowMenu(currentShowOverflowMenu => !currentShowOverflowMenu)
  }
  const handleClickSendToOT3: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    handleSendProtocolToFlex(storedProtocolData)
    setShowOverflowMenu(currentShowOverflowMenu => !currentShowOverflowMenu)
  }
  const handleClickDelete: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    confirmDeleteProtocol()
    setShowOverflowMenu(currentShowOverflowMenu => !currentShowOverflowMenu)
  }
  const handleClickReanalyze: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(analyzeProtocol(protocolKey))
    setShowOverflowMenu(currentShowOverflowMenu => !currentShowOverflowMenu)
  }
  const handleClickTimeline: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    navigate(`/protocols/${protocolKey}/timeline`)
    setShowOverflowMenu(prevShowOverflowMenu => !prevShowOverflowMenu)
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      position={POSITION_RELATIVE}
      onClick={(e: MouseEvent) => {
        e.stopPropagation()
      }}
    >
      <OverflowBtn
        alignSelf={ALIGN_FLEX_END}
        onClick={handleOverflowClick}
        data-testid="ProtocolOverflowMenu_overflowBtn"
      />
      {showOverflowMenu ? (
        <Flex
          whiteSpace={NO_WRAP}
          zIndex={10}
          borderRadius={BORDERS.borderRadius8}
          boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
          position={POSITION_ABSOLUTE}
          backgroundColor={COLORS.white}
          top="2.25rem"
          right="0"
          flexDirection={DIRECTION_COLUMN}
        >
          <MenuItem
            onClick={handleClickRun}
            data-testid="ProtocolOverflowMenu_run"
            css={css`
              border-radius: ${BORDERS.borderRadius8} ${BORDERS.borderRadius8} 0
                0;
            `}
          >
            {t('start_setup')}
          </MenuItem>
          <MenuItem
            onClick={handleClickReanalyze}
            data-testid="ProtocolOverflowMenu_reanalyze"
          >
            {t('shared:reanalyze')}
          </MenuItem>
          {enableProtocolTimeline && robotType === FLEX_ROBOT_TYPE ? (
            <MenuItem onClick={handleClickTimeline}>
              {t('go_to_timeline')}
            </MenuItem>
          ) : null}
          {robotType !== 'OT-2 Standard' ? (
            <MenuItem
              onClick={handleClickSendToOT3}
              data-testid="ProtocolOverflowMenu_sendToOT3"
            >
              {t('protocol_list:send_to_robot_overflow', {
                robot_display_name: FLEX_DISPLAY_NAME,
              })}
            </MenuItem>
          ) : null}
          <MenuItem
            onClick={handleClickShowInFolder}
            data-testid="ProtocolOverflowMenu_showInFolder"
          >
            {t('show_in_folder')}
          </MenuItem>
          <MenuItem
            onClick={handleClickDelete}
            data-testid="ProtocolOverflowMenu_deleteProtocol"
            css={css`
              border-radius: 0 0 ${BORDERS.borderRadius8}
                ${BORDERS.borderRadius8};
            `}
          >
            {t('shared:delete')}
          </MenuItem>
        </Flex>
      ) : null}

      {showDeleteConfirmation
        ? createPortal(
            <ConfirmDeleteProtocolModal
              cancelDeleteProtocol={(e: MouseEvent) => {
                e.preventDefault()
                e.stopPropagation()
                cancelDeleteProtocol()
              }}
              handleClickDelete={handleClickDelete}
            />,
            getTopPortalEl()
          )
        : null}
      {menuOverlay}
    </Flex>
  )
}
