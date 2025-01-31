import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'

import { i18n } from '/app/i18n'
import { getRobotSettings } from '/app/redux/robot-settings'
import { getLocalRobot } from '/app/redux/discovery'
import {
  getAppLanguage,
  toggleDevtools,
  toggleHistoricOffsets,
} from '/app/redux/config'
import { mockConnectedRobot } from '/app/redux/discovery/__fixtures__'
import { Navigation } from '/app/organisms/ODD/Navigation'
import {
  DeviceReset,
  TouchScreenSleep,
  TouchscreenBrightness,
  LanguageSetting,
  NetworkSettings,
  Privacy,
  RobotSystemVersion,
  UpdateChannel,
} from '/app/organisms/ODD/RobotSettingsDashboard'
import { getRobotUpdateAvailable } from '/app/redux/robot-update'
import { useNetworkConnection } from '/app/resources/networking'
import { useLEDLights } from '/app/resources/robot-settings'
import { useErrorRecoverySettingsToggle } from '/app/resources/errorRecovery'

import { RobotSettingsDashboard } from '../'

vi.mock('/app/resources/networking', async () => {
  const actual = await vi.importActual('/app/resources/networking')
  return { ...actual, useNetworkConnection: vi.fn() }
})
vi.mock('/app/redux/discovery')
vi.mock('/app/redux/robot-update')
vi.mock('/app/redux/config')
vi.mock('/app/redux/robot-settings')
vi.mock('/app/resources/robot-settings')
vi.mock('/app/resources/errorRecovery')
vi.mock('/app/organisms/ODD/Navigation')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/TouchScreenSleep')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/NetworkSettings')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/DeviceReset')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/RobotSystemVersion')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/TouchscreenBrightness')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/UpdateChannel')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/Privacy')
vi.mock('/app/organisms/ODD/RobotSettingsDashboard/LanguageSetting')

const mockToggleLights = vi.fn()
const mockToggleER = vi.fn()

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotSettingsDashboard />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const MOCK_DEFAULT_LANGUAGE = 'en-US'

// Note kj 01/25/2023 Currently test cases only check text since this PR is bare-bones for RobotSettings Dashboard
describe('RobotSettingsDashboard', () => {
  beforeEach(() => {
    vi.mocked(getLocalRobot).mockReturnValue(mockConnectedRobot)
    vi.mocked(getRobotSettings).mockReturnValue([
      {
        id: 'disableHomeOnBoot',
        title: 'Disable home on boot',
        description: 'Prevent robot from homing motors on boot',
        restart_required: false,
        value: true,
      },
    ])
    vi.mocked(useLEDLights).mockReturnValue({
      lightsEnabled: false,
      toggleLights: mockToggleLights,
    })
    vi.mocked(useNetworkConnection).mockReturnValue({} as any)
    vi.mocked(useErrorRecoverySettingsToggle).mockReturnValue({
      isEREnabled: true,
      toggleERSettings: mockToggleER,
    })
    vi.mocked(getAppLanguage).mockReturnValue(MOCK_DEFAULT_LANGUAGE)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render Navigation', () => {
    render()
    expect(vi.mocked(Navigation)).toHaveBeenCalled()
  })

  it('should render setting buttons', () => {
    render()
    screen.getByText('Robot Name')
    screen.getByText('opentrons-robot-name')
    screen.getByText('Robot System Version')
    screen.getByText('Network Settings')
    screen.getByText('Status LEDs')
    screen.getByText('Recovery mode')
    screen.getByText(
      'Control the strip of color lights on the front of the robot.'
    )
    screen.getByText('Touchscreen Sleep')
    screen.getByText('Touchscreen Brightness')
    screen.getByText('Privacy')
    screen.getByText('Choose what data to share with Opentrons.')
    screen.getByText('Device Reset')
    screen.getByText('Update Channel')
    screen.getByText('Apply Labware Offsets')
    screen.getByText('Use stored data when setting up a protocol.')
    screen.getByText('Developer Tools')
    screen.getByText('Access additional logging and feature flags.')
  })

  it('should render component when tapping robot name button', () => {
    render()
    const button = screen.getByText('Robot Name')
    fireEvent.click(button)
    screen.getByText('Robot Name')
  })

  it('should render component when tapping robot system version', () => {
    render()
    const button = screen.getByText('Robot System Version')
    fireEvent.click(button)
    expect(vi.mocked(RobotSystemVersion)).toHaveBeenCalled()
  })

  it('should render text with lights off and clicking it, calls useLEDLights', () => {
    render()
    const lights = screen.getByText('Status LEDs')
    fireEvent.click(lights)
    expect(mockToggleLights).toHaveBeenCalled()
  })

  it('should render text with lights on', () => {
    vi.mocked(useLEDLights).mockReturnValue({
      lightsEnabled: true,
      toggleLights: mockToggleLights,
    })
    render()
    expect(
      screen.getByTestId('RobotSettingButton_display_led_lights')
    ).toHaveTextContent('On')
  })

  it('should render appropriate error recovery mode copy, and calls the toggle', () => {
    render()
    const toggle = screen.getByTestId('RobotSettingButton_error_recovery_mode')
    fireEvent.click(toggle)
    expect(mockToggleER).toHaveBeenCalled()
  })

  it('should render the on toggle when ER mode is enabled', () => {
    render()
    expect(
      screen.getByTestId('RobotSettingButton_error_recovery_mode')
    ).toHaveTextContent('On')
  })

  it('should render the off toggle when ER mode is disabled', () => {
    vi.mocked(useErrorRecoverySettingsToggle).mockReturnValue({
      isEREnabled: false,
      toggleERSettings: mockToggleER,
    })
    render()
    expect(
      screen.getByTestId('RobotSettingButton_error_recovery_mode')
    ).toHaveTextContent('Off')
  })

  it('should render component when tapping network settings', () => {
    render()
    const button = screen.getByText('Network Settings')
    fireEvent.click(button)
    expect(vi.mocked(NetworkSettings)).toHaveBeenCalled()
  })

  it('should render component when tapping display touchscreen sleep', () => {
    render()
    const button = screen.getByText('Touchscreen Sleep')
    fireEvent.click(button)
    expect(vi.mocked(TouchScreenSleep)).toHaveBeenCalled()
  })

  it('should render component when tapping touchscreen brightness', () => {
    render()
    const button = screen.getByText('Touchscreen Brightness')
    fireEvent.click(button)
    expect(vi.mocked(TouchscreenBrightness)).toHaveBeenCalled()
  })

  it('should render component when tapping privacy', () => {
    render()
    const button = screen.getByText('Privacy')
    fireEvent.click(button)
    expect(vi.mocked(Privacy)).toHaveBeenCalled()
  })

  it('should render component when tapping device rest', () => {
    render()
    const button = screen.getByText('Device Reset')
    fireEvent.click(button)
    expect(vi.mocked(DeviceReset)).toHaveBeenCalled()
  })

  it('should render component when tapping update channel', () => {
    render()
    const button = screen.getByText('Update Channel')
    fireEvent.click(button)
    expect(vi.mocked(UpdateChannel)).toHaveBeenCalled()
  })

  it('should render text with home gantry off', () => {
    vi.mocked(getRobotSettings).mockReturnValue([
      {
        id: 'disableHomeOnBoot',
        title: 'Disable home on boot',
        description: 'Prevent robot from homing motors on boot',
        restart_required: false,
        value: false,
      },
    ])
    render()
    expect(
      screen.getByTestId('RobotSettingButton_home_gantry_on_restart')
    ).toHaveTextContent('On')
  })

  it('should call a mock function when tapping enable historic offset', () => {
    render()
    const button = screen.getByText('Apply Labware Offsets')
    fireEvent.click(button)
    expect(vi.mocked(toggleHistoricOffsets)).toHaveBeenCalled()
  })

  it('should call a mock function when tapping enable dev tools', () => {
    render()
    const button = screen.getByText('Developer Tools')
    fireEvent.click(button)
    expect(vi.mocked(toggleDevtools)).toHaveBeenCalled()
  })

  it('should return an update available with correct text', () => {
    vi.mocked(getRobotUpdateAvailable).mockReturnValue('upgrade')
    render()
    screen.getByText('Update available')
  })

  it('should render component when tapping Language', () => {
    render()

    screen.getByText('English (US)')
    const button = screen.getByText('Language')
    fireEvent.click(button)
    expect(vi.mocked(LanguageSetting)).toHaveBeenCalled()
  })
})
