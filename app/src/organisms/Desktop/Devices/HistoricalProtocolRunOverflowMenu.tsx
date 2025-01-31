import { useTranslation } from 'react-i18next'
import { NavLink, useNavigate } from 'react-router-dom'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  FLEX_MAX_CONTENT,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  MenuItem,
  NO_WRAP,
  OverflowBtn,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  SIZE_1,
  SPACING,
  Tooltip,
  useHoverTooltip,
  useMenuHandleClickOutside,
  useOnClickOutside,
} from '@opentrons/components'
import { useDeleteRunMutation } from '@opentrons/react-api-client'

import { Divider } from '/app/atoms/structure'
import { useRunControls } from '/app/organisms/RunTimeControl'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
  ANALYTICS_PROTOCOL_RUN_ACTION,
} from '/app/redux/analytics'
import { useIsRobotOnWrongVersionOfSoftware } from '/app/redux/robot-update'
import { useDownloadRunLog } from './hooks'
import { useIsEstopNotDisengaged } from '/app/resources/devices'
import { useTrackProtocolRunEvent } from '/app/redux-resources/analytics'
import { useRobot } from '/app/redux-resources/robots'

import type { MouseEventHandler } from 'react'
import type { Run } from '@opentrons/api-client'

export interface HistoricalProtocolRunOverflowMenuProps {
  runId: string
  robotName: string
  robotIsBusy: boolean
}

export function HistoricalProtocolRunOverflowMenu(
  props: HistoricalProtocolRunOverflowMenuProps
): JSX.Element {
  const { runId, robotName } = props
  const {
    menuOverlay,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  } = useMenuHandleClickOutside()
  const protocolRunOverflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      setShowOverflowMenu(false)
    },
  })
  const { downloadRunLog, isRunLogLoading } = useDownloadRunLog(
    robotName,
    runId
  )
  const isEstopNotDisengaged = useIsEstopNotDisengaged(robotName)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      position={POSITION_RELATIVE}
      data-testid="HistoricalProtocolRunOverflowMenu_OverflowMenu"
    >
      <OverflowBtn
        alignSelf={ALIGN_FLEX_END}
        onClick={handleOverflowClick}
        disabled={isEstopNotDisengaged}
      />
      {showOverflowMenu ? (
        <>
          <Box
            ref={protocolRunOverflowWrapperRef}
            data-testid={`HistoricalProtocolRunOverflowMenu_${runId}`}
          >
            <MenuDropdown
              {...props}
              downloadRunLog={downloadRunLog}
              isRunLogLoading={isRunLogLoading}
              closeOverflowMenu={handleOverflowClick}
            />
          </Box>
          {menuOverlay}
        </>
      ) : null}
    </Flex>
  )
}

interface MenuDropdownProps extends HistoricalProtocolRunOverflowMenuProps {
  closeOverflowMenu: MouseEventHandler<HTMLButtonElement>
  downloadRunLog: () => void
  isRunLogLoading: boolean
}
function MenuDropdown(props: MenuDropdownProps): JSX.Element {
  const { t } = useTranslation('device_details')
  const navigate = useNavigate()

  const {
    runId,
    robotName,
    robotIsBusy,
    closeOverflowMenu,
    downloadRunLog,
    isRunLogLoading,
  } = props

  const isRobotOnWrongVersionOfSoftware = useIsRobotOnWrongVersionOfSoftware(
    robotName
  )

  const [targetProps, tooltipProps] = useHoverTooltip()
  const onResetSuccess = (createRunResponse: Run): void => {
    navigate(
      `/devices/${robotName}/protocol-runs/${createRunResponse.data.id}/run-preview`
    )
  }
  const onDownloadClick: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    downloadRunLog()
    closeOverflowMenu(e)
  }
  const trackEvent = useTrackEvent()
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const { reset, isResetRunLoading, isRunControlLoading } = useRunControls(
    runId,
    onResetSuccess
  )
  const { deleteRun } = useDeleteRunMutation()
  const robot = useRobot(robotName)
  const robotSerialNumber =
    robot?.health?.robot_serial ?? robot?.serverHealth?.serialNumber ?? null

  const handleResetClick: MouseEventHandler<HTMLButtonElement> = (e): void => {
    e.preventDefault()
    e.stopPropagation()

    reset()
    trackEvent({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: {
        sourceLocation: 'HistoricalProtocolRun',
        robotSerialNumber,
      },
    })
    trackProtocolRunEvent({ name: ANALYTICS_PROTOCOL_RUN_ACTION.AGAIN })
  }

  const handleDeleteClick: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    e.stopPropagation()
    deleteRun(runId)
    closeOverflowMenu(e)
  }

  return (
    <Flex
      whiteSpace={NO_WRAP}
      zIndex={10}
      borderRadius="4px 4px 0px 0px"
      boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
      position={POSITION_ABSOLUTE}
      backgroundColor={COLORS.white}
      top="2.3rem"
      right={0}
      flexDirection={DIRECTION_COLUMN}
      width={FLEX_MAX_CONTENT}
    >
      <NavLink to={`/devices/${robotName}/protocol-runs/${runId}/run-preview`}>
        <MenuItem data-testid="RecentProtocolRun_OverflowMenu_viewRunRecord">
          {t('view_run_record')}
        </MenuItem>
      </NavLink>
      <MenuItem
        {...targetProps}
        onClick={handleResetClick}
        disabled={
          robotIsBusy || isRobotOnWrongVersionOfSoftware || isRunControlLoading
        }
        data-testid="RecentProtocolRun_OverflowMenu_rerunNow"
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
          {t('rerun_now')}
          {isResetRunLoading ? (
            <Icon
              name="ot-spinner"
              size={SIZE_1}
              color={COLORS.grey50}
              aria-label="spinner"
              spin
            />
          ) : null}
        </Flex>
      </MenuItem>
      {isRobotOnWrongVersionOfSoftware && (
        <Tooltip tooltipProps={tooltipProps}>
          {t('shared:a_software_update_is_available')}
        </Tooltip>
      )}
      {isRunControlLoading && (
        <Tooltip whiteSpace="normal" tooltipProps={tooltipProps}>
          {t('rerun_loading')}
        </Tooltip>
      )}
      <MenuItem
        data-testid="RecentProtocolRun_OverflowMenu_downloadRunLog"
        disabled={isRunLogLoading}
        onClick={onDownloadClick}
      >
        <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
          {t('download_run_log')}
          {isRunLogLoading ? (
            <Icon
              name="ot-spinner"
              size={SIZE_1}
              color={COLORS.grey50}
              aria-label="spinner"
              spin
            />
          ) : null}
        </Flex>
      </MenuItem>
      <Divider marginY="0" />
      <MenuItem
        onClick={handleDeleteClick}
        data-testid="RecentProtocolRun_OverflowMenu_deleteRun"
      >
        {t('delete_run')}
      </MenuItem>
    </Flex>
  )
}
