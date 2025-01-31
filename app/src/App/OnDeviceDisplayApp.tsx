import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { css } from 'styled-components'
import { ErrorBoundary } from 'react-error-boundary'

import {
  Box,
  COLORS,
  OVERFLOW_AUTO,
  POSITION_RELATIVE,
  useScrolling,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'
import NiceModal from '@ebay/nice-modal-react'

import { SleepScreen } from '/app/atoms/SleepScreen'
import { LocalizationProvider } from '../LocalizationProvider'
import { ToasterOven } from '/app/organisms/ToasterOven'
import { MaintenanceRunTakeover } from '/app/organisms/TakeoverModal'
import { FirmwareUpdateTakeover } from '/app/organisms/FirmwareUpdateModal/FirmwareUpdateTakeover'
import { IncompatibleModuleTakeover } from '/app/organisms/IncompatibleModule'
import { EstopTakeover } from '/app/organisms/EmergencyStop'
import { ChooseLanguage } from '/app/pages/ODD/ChooseLanguage'
import { ConnectViaEthernet } from '/app/pages/ODD/ConnectViaEthernet'
import { ConnectViaUSB } from '/app/pages/ODD/ConnectViaUSB'
import { ConnectViaWifi } from '/app/pages/ODD/ConnectViaWifi'
import { EmergencyStop } from '/app/pages/ODD/EmergencyStop'
import { NameRobot } from '/app/pages/ODD/NameRobot'
import { NetworkSetupMenu } from '/app/pages/ODD/NetworkSetupMenu'
import { ProtocolSetup } from '/app/pages/ODD/ProtocolSetup'
import { RobotDashboard } from '/app/pages/ODD/RobotDashboard'
import { RobotSettingsDashboard } from '/app/pages/ODD/RobotSettingsDashboard'
import { ProtocolDashboard } from '/app/pages/ODD/ProtocolDashboard'
import { ProtocolDetails } from '/app/pages/ODD/ProtocolDetails'
import { QuickTransferFlow } from '/app/organisms/ODD/QuickTransferFlow'
import { QuickTransferDashboard } from '/app/pages/ODD/QuickTransferDashboard'
import { QuickTransferDetails } from '/app/pages/ODD/QuickTransferDetails'
import { RunningProtocol } from '/app/pages/ODD/RunningProtocol'
import { RunSummary } from '/app/pages/ODD/RunSummary'
import { UpdateRobot } from '/app/pages/ODD/UpdateRobot/UpdateRobot'
import { UpdateRobotDuringOnboarding } from '/app/pages/ODD/UpdateRobot/UpdateRobotDuringOnboarding'
import { InstrumentsDashboard } from '/app/pages/ODD/InstrumentsDashboard'
import { InstrumentDetail } from '/app/pages/ODD/InstrumentDetail'
import { Welcome } from '/app/pages/ODD/Welcome'
import { InitialLoadingScreen } from '/app/pages/ODD/InitialLoadingScreen'
import { DeckConfigurationEditor } from '/app/pages/ODD/DeckConfiguration'
import { PortalRoot as ModalPortalRoot } from './portal'
import {
  getOnDeviceDisplaySettings,
  updateConfigValue,
} from '/app/redux/config'
import { updateBrightness } from '/app/redux/shell'
import { useScreenIdle, SLEEP_NEVER_MS } from '/app/local-resources/dom-utils'
import { useProtocolReceiptToast, useSoftwareUpdatePoll } from './hooks'
import { ODDTopLevelRedirects } from './ODDTopLevelRedirects'
import { ReactQueryDevtools } from '/app/App/tools'

import { OnDeviceDisplayAppFallback } from './OnDeviceDisplayAppFallback'

import { hackWindowNavigatorOnLine } from './hacks'

import type { Dispatch } from '/app/redux/types'

// forces electron to think we're online which means axios won't elide
// network calls to localhost. see ./hacks.ts for more.
hackWindowNavigatorOnLine()

export const ON_DEVICE_DISPLAY_PATHS = [
  '/choose-language',
  '/dashboard',
  '/deck-configuration',
  '/emergency-stop',
  '/instruments',
  '/instruments/:mount',
  '/network-setup',
  '/network-setup/ethernet',
  '/network-setup/usb',
  '/network-setup/wifi',
  '/protocols',
  '/protocols/:protocolId',
  '/quick-transfer',
  '/quick-transfer/new',
  '/quick-transfer/:quickTransferId',
  '/robot-settings',
  '/robot-settings/rename-robot',
  '/robot-settings/update-robot',
  '/robot-settings/update-robot-during-onboarding',
  '/runs/:runId/run',
  '/runs/:runId/setup',
  '/runs/:runId/summary',
  '/welcome',
] as const

function getPathComponent(
  path: typeof ON_DEVICE_DISPLAY_PATHS[number]
): JSX.Element {
  switch (path) {
    case '/choose-language':
      return <ChooseLanguage />
    case '/dashboard':
      return <RobotDashboard />
    case '/deck-configuration':
      return <DeckConfigurationEditor />
    case '/emergency-stop':
      return <EmergencyStop />
    case '/instruments':
      return <InstrumentsDashboard />
    case '/instruments/:mount':
      return <InstrumentDetail />
    case '/network-setup':
      return <NetworkSetupMenu />
    case '/network-setup/ethernet':
      return <ConnectViaEthernet />
    case '/network-setup/usb':
      return <ConnectViaUSB />
    case '/network-setup/wifi':
      return <ConnectViaWifi />
    case '/protocols':
      return <ProtocolDashboard />
    case '/protocols/:protocolId':
      return <ProtocolDetails />
    case '/quick-transfer':
      return <QuickTransferDashboard />
    case '/quick-transfer/new':
      return <QuickTransferFlow />
    case '/quick-transfer/:quickTransferId':
      return <QuickTransferDetails />
    case '/robot-settings':
      return <RobotSettingsDashboard />
    case '/robot-settings/rename-robot':
      return <NameRobot />
    case '/robot-settings/update-robot':
      return <UpdateRobot />
    case '/robot-settings/update-robot-during-onboarding':
      return <UpdateRobotDuringOnboarding />
    case '/runs/:runId/run':
      return <RunningProtocol />
    case '/runs/:runId/setup':
      return <ProtocolSetup />
    case '/runs/:runId/summary':
      return <RunSummary />
    case '/welcome':
      return <Welcome />
  }
}

const onDeviceDisplayEvents: Array<keyof DocumentEventMap> = [
  'mousedown',
  'click',
  'scroll',
]

const TURN_OFF_BACKLIGHT = '7'

export const OnDeviceDisplayApp = (): JSX.Element => {
  useSoftwareUpdatePoll()
  const { brightness: userSetBrightness, sleepMs } = useSelector(
    getOnDeviceDisplaySettings
  )

  const sleepTime = sleepMs ?? SLEEP_NEVER_MS
  const options = {
    events: onDeviceDisplayEvents,
    initialState: false,
  }
  const dispatch = useDispatch<Dispatch>()
  const isIdle = useScreenIdle(sleepTime, options)

  useEffect(() => {
    if (isIdle) {
      dispatch(updateBrightness(TURN_OFF_BACKLIGHT))
    } else {
      dispatch(
        updateConfigValue(
          'onDeviceDisplaySettings.brightness',
          userSetBrightness
        )
      )
    }
  }, [dispatch, isIdle, userSetBrightness])

  // TODO (sb:6/12/23) Create a notification manager to set up preference and order of takeover modals
  return (
    <ApiHostProvider hostname="127.0.0.1">
      <ReactQueryDevtools />
      <InitialLoadingScreen>
        <LocalizationProvider>
          <ErrorBoundary FallbackComponent={OnDeviceDisplayAppFallback}>
            <Box width="100%" css="user-select: none;">
              {isIdle ? (
                <SleepScreen />
              ) : (
                <>
                  <IncompatibleModuleTakeover isOnDevice={true} />
                  <MaintenanceRunTakeover>
                    <EstopTakeover />
                    <FirmwareUpdateTakeover />
                    <NiceModal.Provider>
                      <ToasterOven>
                        <ProtocolReceiptToasts />
                        <OnDeviceDisplayAppRoutes />
                      </ToasterOven>
                    </NiceModal.Provider>
                  </MaintenanceRunTakeover>
                </>
              )}
            </Box>
            <ODDTopLevelRedirects />
          </ErrorBoundary>
        </LocalizationProvider>
      </InitialLoadingScreen>
    </ApiHostProvider>
  )
}

const getTargetPath = (unfinishedUnboxingFlowRoute: string | null): string => {
  if (unfinishedUnboxingFlowRoute != null) {
    return unfinishedUnboxingFlowRoute
  }

  return '/dashboard'
}

// split to a separate function because scrollRef rerenders on every route change
// this avoids rerendering parent providers as well
export function OnDeviceDisplayAppRoutes(): JSX.Element {
  const [currentNode, setCurrentNode] = useState<null | HTMLElement>(null)
  const scrollRef = useCallback((node: HTMLElement | null) => {
    setCurrentNode(node)
  }, [])
  const isScrolling = useScrolling(currentNode)
  const location = useLocation()
  useEffect(() => {
    currentNode?.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  }, [location.pathname])

  const { unfinishedUnboxingFlowRoute } = useSelector(
    getOnDeviceDisplaySettings
  )

  const targetPath = getTargetPath(unfinishedUnboxingFlowRoute)

  const TOUCH_SCREEN_STYLE = css`
    position: ${POSITION_RELATIVE};
    width: 100%;
    height: 100%;
    background-color: ${COLORS.white};
    overflow-y: ${OVERFLOW_AUTO};

    &::-webkit-scrollbar {
      display: block;
      width: 0.75rem;
    }

    &::-webkit-scrollbar-thumb {
      display: ${isScrolling ? 'block' : 'none'};
      background: ${COLORS.grey50};
      border-radius: 11px;
    }
  `

  return (
    <Routes>
      {ON_DEVICE_DISPLAY_PATHS.map(path => (
        <Route
          key={path}
          path={path}
          element={
            <Box css={TOUCH_SCREEN_STYLE} ref={scrollRef}>
              <ModalPortalRoot />
              {getPathComponent(path)}
            </Box>
          }
        />
      ))}
      {targetPath != null && (
        <Route path="*" element={<Navigate to={targetPath} replace />} />
      )}
    </Routes>
  )
}

function ProtocolReceiptToasts(): null {
  useProtocolReceiptToast()
  return null
}
