import { MemoryRouter } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { vi, describe, beforeEach, afterEach, expect, it } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LocalizationProvider } from '/app/LocalizationProvider'
import { Breadcrumbs } from '/app/organisms/Desktop/Breadcrumbs'
import { SystemLanguagePreferenceModal } from '/app/organisms/Desktop/SystemLanguagePreferenceModal'
import { CalibrationDashboard } from '/app/pages/Desktop/Devices/CalibrationDashboard'
import { DeviceDetails } from '/app/pages/Desktop/Devices/DeviceDetails'
import { DevicesLanding } from '/app/pages/Desktop/Devices/DevicesLanding'
import { ProtocolsLanding } from '/app/pages/Desktop/Protocols/ProtocolsLanding'
import { ProtocolRunDetails } from '/app/pages/Desktop/Devices/ProtocolRunDetails'
import { RobotSettings } from '/app/pages/Desktop/Devices/RobotSettings'
import { GeneralSettings } from '/app/pages/Desktop/AppSettings/GeneralSettings'
import { AlertsModal } from '/app/organisms/Desktop/Alerts/AlertsModal'
import { useFeatureFlag } from '/app/redux/config'
import { useIsFlex } from '/app/redux-resources/robots'
import { ProtocolTimeline } from '/app/pages/Desktop/Protocols/ProtocolDetails/ProtocolTimeline'
import { useSoftwareUpdatePoll } from '../hooks'
import { DesktopApp } from '../DesktopApp'

import type { LocalizationProviderProps } from '/app/LocalizationProvider'

vi.mock('/app/LocalizationProvider')
vi.mock('/app/organisms/Desktop/Breadcrumbs')
vi.mock('/app/organisms/Desktop/SystemLanguagePreferenceModal')
vi.mock('/app/pages/Desktop/AppSettings/GeneralSettings')
vi.mock('/app/pages/Desktop/Devices/CalibrationDashboard')
vi.mock('/app/pages/Desktop/Devices/DeviceDetails')
vi.mock('/app/pages/Desktop/Devices/DevicesLanding')
vi.mock('/app/pages/Desktop/Protocols/ProtocolsLanding')
vi.mock('/app/pages/Desktop/Devices/ProtocolRunDetails')
vi.mock('/app/pages/Desktop/Devices/RobotSettings')
vi.mock('/app/organisms/Desktop/Alerts/AlertsModal')
vi.mock('/app/pages/Desktop/Protocols/ProtocolDetails/ProtocolTimeline')
vi.mock('/app/redux/config')
vi.mock('/app/redux-resources/robots')
vi.mock('../hooks')

const render = (path = '/') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <DesktopApp />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('DesktopApp', () => {
  beforeEach(() => {
    when(vi.mocked(useFeatureFlag))
      .calledWith('protocolTimeline')
      .thenReturn(true)
    vi.mocked(CalibrationDashboard).mockReturnValue(
      <div>Mock CalibrationDashboard</div>
    )
    vi.mocked(DeviceDetails).mockReturnValue(<div>Mock DeviceDetails</div>)
    vi.mocked(DevicesLanding).mockReturnValue(<div>Mock DevicesLanding</div>)
    vi.mocked(ProtocolsLanding).mockReturnValue(
      <div>Mock ProtocolsLanding</div>
    )
    vi.mocked(ProtocolRunDetails).mockReturnValue(
      <div>Mock ProtocolRunDetails</div>
    )
    vi.mocked(ProtocolTimeline).mockReturnValue(
      <div>Mock ProtocolTimeline</div>
    )
    vi.mocked(RobotSettings).mockReturnValue(<div>Mock RobotSettings</div>)
    vi.mocked(GeneralSettings).mockReturnValue(<div>Mock AppSettings</div>)
    vi.mocked(Breadcrumbs).mockReturnValue(<div>Mock Breadcrumbs</div>)
    vi.mocked(SystemLanguagePreferenceModal).mockReturnValue(
      <div>Mock SystemLanguagePreferenceModal</div>
    )
    vi.mocked(AlertsModal).mockReturnValue(<></>)
    vi.mocked(useIsFlex).mockReturnValue(true)
    vi.mocked(
      LocalizationProvider
    ).mockImplementation((props: LocalizationProviderProps) => (
      <>{props.children}</>
    ))
    when(vi.mocked(useFeatureFlag)).calledWith('reactScan').thenReturn(false)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('renders a Breadcrumbs component', () => {
    render('/devices')
    screen.getByText('Mock Breadcrumbs')
  })

  it('renders a SystemLanguagePreferenceModal component', () => {
    render('/protocols')
    screen.getByText('Mock SystemLanguagePreferenceModal')
  })

  it('renders an AppSettings component', () => {
    render('/app-settings/general')
    screen.getByText('Mock AppSettings')
  })

  it('renders a DevicesLanding component from /devices', () => {
    render('/devices')
    screen.getByText('Mock DevicesLanding')
  })

  it('renders a DeviceDetails component from /devices/:robotName', () => {
    render('/devices/otie')
    screen.getByText('Mock DeviceDetails')
  })

  it('renders a RobotSettings component from /devices/:robotName/robot-settings/:robotSettingsTab', () => {
    render('/devices/otie/robot-settings/calibration')
    screen.getByText('Mock RobotSettings')
  })

  it('renders a CalibrationDashboard component from /devices/:robotName/robot-settings/calibration/dashboard', () => {
    render('/devices/otie/robot-settings/calibration/dashboard')
    screen.getByText('Mock CalibrationDashboard')
  })

  it('renders a ProtocolsLanding component from /protocols', () => {
    render('/protocols')
    screen.getByText('Mock ProtocolsLanding')
  })

  it('renders a ProtocolsTimeline component from /protocolTimeline', () => {
    render(`/protocols/95e67900-bc9f-4fbf-92c6-cc4d7226a51b/timeline`)
    screen.getByText('Mock ProtocolTimeline')
  })

  it('renders a ProtocolRunDetails component from /devices/:robotName/protocol-runs/:runId/:protocolRunDetailsTab', () => {
    render(
      '/devices/otie/protocol-runs/95e67900-bc9f-4fbf-92c6-cc4d7226a51b/setup'
    )
    screen.getByText('Mock ProtocolRunDetails')
  })

  it('should poll for software updates', () => {
    render()
    expect(vi.mocked(useSoftwareUpdatePoll)).toBeCalled()
  })
})
