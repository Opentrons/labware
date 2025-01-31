import { useState, Fragment } from 'react'
import { Navigate, Route, Routes, useMatch } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import {
  Box,
  COLORS,
  OVERFLOW_AUTO,
  POSITION_RELATIVE,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'
import NiceModal from '@ebay/nice-modal-react'

import { LocalizationProvider } from '/app/LocalizationProvider'
import { Alerts } from '/app/organisms/Desktop/Alerts'
import { Breadcrumbs } from '/app/organisms/Desktop/Breadcrumbs'
import { SystemLanguagePreferenceModal } from '/app/organisms/Desktop/SystemLanguagePreferenceModal'
import { ToasterOven } from '/app/organisms/ToasterOven'
import { CalibrationDashboard } from '/app/pages/Desktop/Devices/CalibrationDashboard'
import { DeviceDetails } from '/app/pages/Desktop/Devices/DeviceDetails'
import { DevicesLanding } from '/app/pages/Desktop/Devices/DevicesLanding'
import { ProtocolRunDetails } from '/app/pages/Desktop/Devices/ProtocolRunDetails'
import { RobotSettings } from '/app/pages/Desktop/Devices/RobotSettings'
import { ProtocolsLanding } from '/app/pages/Desktop/Protocols/ProtocolsLanding'
import { ProtocolDetails } from '/app/pages/Desktop/Protocols/ProtocolDetails'
import { AppSettings } from '/app/pages/Desktop/AppSettings'
import { Labware } from '/app/pages/Desktop/Labware'
import { useSoftwareUpdatePoll } from './hooks'
import { Navbar } from './Navbar'
import {
  EstopTakeover,
  EmergencyStopContext,
} from '/app/organisms/EmergencyStop'
import { IncompatibleModuleTakeover } from '/app/organisms/IncompatibleModule'
import { OPENTRONS_USB } from '/app/redux/discovery'
import { appShellRequestor } from '/app/redux/shell/remote'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { ProtocolTimeline } from '/app/pages/Desktop/Protocols/ProtocolDetails/ProtocolTimeline'
import { PortalRoot as ModalPortalRoot } from './portal'
import { DesktopAppFallback } from './DesktopAppFallback'
import { ReactQueryDevtools } from './tools'
import { useFeatureFlag } from '../redux/config'

import type { RouteProps } from './types'

export const DesktopApp = (): JSX.Element => {
  useSoftwareUpdatePoll()
  const [
    isEmergencyStopModalDismissed,
    setIsEmergencyStopModalDismissed,
  ] = useState<boolean>(false)

  // note for react-scan
  const enableReactScan = useFeatureFlag('reactScan')
  // Dynamically import `react-scan` to avoid build errors
  if (typeof window !== 'undefined' && enableReactScan) {
    import('react-scan')
      .then(({ scan }) => {
        scan({
          enabled: enableReactScan,
          log: true,
        })
      })
      .catch(error => {
        console.error('Failed to load react-scan:', error)
      })
  }

  const desktopRoutes: RouteProps[] = [
    {
      Component: ProtocolsLanding,
      name: 'protocols',
      navLinkTo: '/protocols',
      path: '/protocols',
    },
    {
      Component: ProtocolDetails,
      name: 'Protocol Details',
      path: '/protocols/:protocolKey',
    },
    {
      Component: ProtocolTimeline,
      name: 'Protocol Timeline',
      path: '/protocols/:protocolKey/timeline',
    },
    {
      Component: Labware,
      name: 'labware',
      navLinkTo: '/labware',
      path: '/labware',
    },
    {
      Component: DevicesLanding,
      name: 'devices',
      navLinkTo: '/devices',
      path: '/devices',
    },
    {
      Component: DeviceDetails,
      name: 'Device',
      path: '/devices/:robotName',
    },
    {
      Component: RobotSettings,
      name: 'Robot Settings',
      path: '/devices/:robotName/robot-settings/:robotSettingsTab?',
    },
    {
      Component: CalibrationDashboard,
      name: 'Calibration Dashboard',
      path: '/devices/:robotName/robot-settings/calibration/dashboard',
    },
    {
      Component: ProtocolRunDetails,
      name: 'Run Details',
      path: '/devices/:robotName/protocol-runs/:runId/:protocolRunDetailsTab?',
    },
    {
      Component: AppSettings,
      name: 'App Settings',
      path: '/app-settings/:appSettingsTab?',
    },
  ]

  return (
    <NiceModal.Provider>
      <LocalizationProvider>
        <ErrorBoundary FallbackComponent={DesktopAppFallback}>
          <ReactQueryDevtools />
          <SystemLanguagePreferenceModal />
          <Navbar routes={desktopRoutes} />
          <ToasterOven>
            <EmergencyStopContext.Provider
              value={{
                isEmergencyStopModalDismissed,
                setIsEmergencyStopModalDismissed,
              }}
            >
              <Box width="100%">
                <Alerts>
                  <Routes>
                    {desktopRoutes.map(({ Component, path }: RouteProps) => {
                      return (
                        <Route
                          key={path}
                          element={
                            <Fragment key={Component.name}>
                              <Breadcrumbs />
                              <Box
                                position={POSITION_RELATIVE}
                                width="100%"
                                height="100%"
                              >
                                <Box
                                  width="100%"
                                  height="100%"
                                  backgroundColor={COLORS.grey10}
                                  overflow={OVERFLOW_AUTO}
                                >
                                  <ModalPortalRoot />
                                  <Component />
                                </Box>
                              </Box>
                            </Fragment>
                          }
                          path={path}
                        />
                      )
                    })}
                    <Route path="*" element={<Navigate to="/protocols" />} />
                  </Routes>
                  <RobotControlTakeover />
                </Alerts>
              </Box>
            </EmergencyStopContext.Provider>
          </ToasterOven>
        </ErrorBoundary>
      </LocalizationProvider>
    </NiceModal.Provider>
  )
}

function RobotControlTakeover(): JSX.Element | null {
  const deviceRouteMatch = useMatch('/devices/:robotName/*')
  const params = deviceRouteMatch?.params
  const robotName = params?.robotName ?? null
  const robot = useRobot(robotName)
  if (deviceRouteMatch == null || robot == null || robotName == null)
    return null

  return (
    <ApiHostProvider
      key={robot.name}
      hostname={robot.ip ?? null}
      requestor={robot?.ip === OPENTRONS_USB ? appShellRequestor : undefined}
    >
      <FlexOnlyRobotControlTakeover robotName={robotName} />
      <AllRobotsRobotControlTakeover robotName={robotName} />
    </ApiHostProvider>
  )
}

interface TakeoverProps {
  robotName: string
}

function AllRobotsRobotControlTakeover({
  robotName,
}: TakeoverProps): JSX.Element | null {
  return <IncompatibleModuleTakeover isOnDevice={false} robotName={robotName} />
}

function FlexOnlyRobotControlTakeover({
  robotName,
}: TakeoverProps): JSX.Element | null {
  // E-stop is not supported on OT2
  const isFlex = useIsFlex(robotName)
  if (!isFlex) {
    return null
  }
  return <EstopTakeover robotName={robotName} />
}
