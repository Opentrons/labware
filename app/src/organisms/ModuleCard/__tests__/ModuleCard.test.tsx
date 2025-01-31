import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RUN_STATUS_IDLE, RUN_STATUS_RUNNING } from '@opentrons/api-client'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getIsHeaterShakerAttached } from '/app/redux/config'
import {
  mockMagneticModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
  mockHeaterShaker,
} from '/app/redux/modules/__fixtures__'
import { mockRobot } from '/app/redux/robot-api/__fixtures__'
import { useIsEstopNotDisengaged } from '/app/resources/devices'
import { FAILURE, getRequestById, PENDING, SUCCESS } from '/app/redux/robot-api'
import { useCurrentRunStatus } from '/app/organisms/RunTimeControl'
import { useToaster } from '/app/organisms/ToasterOven'
import { useIsFlex } from '/app/redux-resources/robots'
import { MagneticModuleData } from '../MagneticModuleData'
import { TemperatureModuleData } from '../TemperatureModuleData'
import { ThermocyclerModuleData } from '../ThermocyclerModuleData'
import { HeaterShakerModuleData } from '../HeaterShakerModuleData'
import { ModuleOverflowMenu } from '../ModuleOverflowMenu'
import { FirmwareUpdateFailedModal } from '../FirmwareUpdateFailedModal'
import { ErrorInfo } from '../ErrorInfo'
import { ModuleCard } from '..'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type {
  HeaterShakerModule,
  MagneticModule,
  ThermocyclerModule,
} from '/app/redux/modules/types'

vi.mock('../ErrorInfo')
vi.mock('../MagneticModuleData')
vi.mock('../TemperatureModuleData')
vi.mock('../ThermocyclerModuleData')
vi.mock('../HeaterShakerModuleData')
vi.mock('/app/redux/config')
vi.mock('../ModuleOverflowMenu')
vi.mock('/app/organisms/RunTimeControl')
vi.mock('../FirmwareUpdateFailedModal')
vi.mock('/app/redux/robot-api')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/organisms/ToasterOven')
vi.mock('/app/resources/devices')

const mockMagneticModuleHub = {
  id: 'magdeck_id',
  moduleModel: 'magneticModuleV1',
  moduleType: 'magneticModuleType',
  serialNumber: 'def456',
  hardwareRevision: 'mag_deck_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    engaged: false,
    height: 42,
    status: 'disengaged',
  },
  usbPort: {
    hub: true,
    path: '/dev/ot_module_magdeck0',
    port: 1,
    portGroup: 'unknown',
  },
} as MagneticModule

const mockHotHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: false,
  data: {
    labwareLatchStatus: 'idle_open',
    speedStatus: 'idle',
    temperatureStatus: 'heating',
    currentSpeed: null,
    currentTemperature: 50,
    targetSpeed: null,
    targetTemperature: 60,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: {
    path: '/dev/ot_module_heatershaker0',
    hub: false,
    port: 1,
    portGroup: 'unknown',
  },
} as HeaterShakerModule

const mockHotThermoGen2 = {
  id: 'thermocycler_id',
  moduleModel: 'thermocyclerModuleV2',
  moduleType: 'thermocyclerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'thermocycler_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: false,
  data: {
    lidStatus: 'open',
    lidTargetTemperature: null,
    lidTemperature: 50,
    currentTemperature: 60,
    targetTemperature: 65,
    holdTime: null,
    rampRate: null,
    currentCycleIndex: null,
    totalCycleCount: null,
    currentStepIndex: null,
    totalStepCount: null,
    lidTemperatureStatus: 'idle',
    status: 'heating',
  },
  usbPort: {
    path: '/dev/ot_module_thermocycler',
    hub: false,
    port: 1,
    portGroup: 'unknown',
  },
} as ThermocyclerModule

const mockHotThermo = {
  id: 'thermocycler_id',
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'thermocycler_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  moduleOffset: {
    offset: {
      x: 0.1171875,
      y: -0.3046875,
      z: -0.32600000000004314,
    },
    slot: 'D1',
    last_modified: '2023-07-25T14:03:17.692062+00:00',
  },
  data: {
    lidStatus: 'open',
    lidTargetTemperature: null,
    lidTemperature: 50,
    currentTemperature: 60,
    targetTemperature: 65,
    holdTime: null,
    rampRate: null,
    currentCycleIndex: null,
    totalCycleCount: null,
    currentStepIndex: null,
    totalStepCount: null,
    lidTemperatureStatus: 'idle',
    status: 'heating',
  },
  usbPort: {
    path: '/dev/ot_module_thermocycler',
    hub: false,
    port: 1,
    portGroup: 'unknown',
  },
} as ThermocyclerModule

const mockMakeSnackbar = vi.fn()
const mockMakeToast = vi.fn()
const mockEatToast = vi.fn()

const MOCK_LATEST_REQUEST_ID = '1234'

const render = (props: ComponentProps<typeof ModuleCard>) => {
  return renderWithProviders(<ModuleCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ModuleCard', () => {
  let props: ComponentProps<typeof ModuleCard>
  let mockHandleModuleApiRequests: Mock

  beforeEach(() => {
    mockHandleModuleApiRequests = vi.fn()

    props = {
      module: mockMagneticModule,
      robotName: mockRobot.name,
      isLoadedInRun: false,
      attachPipetteRequired: false,
      calibratePipetteRequired: false,
      updatePipetteFWRequired: false,
      handleModuleApiRequests: mockHandleModuleApiRequests,
      latestRequestId: MOCK_LATEST_REQUEST_ID,
    }

    vi.mocked(ErrorInfo).mockReturnValue(null)
    vi.mocked(MagneticModuleData).mockReturnValue(
      <div>Mock Magnetic Module Data</div>
    )
    vi.mocked(ThermocyclerModuleData).mockReturnValue(
      <div>Mock Thermocycler Module Data</div>
    )
    vi.mocked(HeaterShakerModuleData).mockReturnValue(
      <div>Mock Heater Shaker Module Data</div>
    )
    vi.mocked(ModuleOverflowMenu).mockReturnValue(
      <div>mock module overflow menu</div>
    )
    vi.mocked(FirmwareUpdateFailedModal).mockReturnValue(
      <div>mock firmware update failed modal</div>
    )
    vi.mocked(useToaster).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
      makeToast: mockMakeToast,
      eatToast: mockEatToast,
    })
    vi.mocked(getRequestById).mockReturnValue(null)
    when(useCurrentRunStatus).calledWith().thenReturn(RUN_STATUS_IDLE)
    when(useIsFlex).calledWith(props.robotName).thenReturn(true)
    when(useIsEstopNotDisengaged).calledWith(props.robotName).thenReturn(false)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders information for a magnetic module with mocked status', () => {
    render(props)
    screen.getByText('Magnetic Module GEN1')
    screen.getByText('Mock Magnetic Module Data')
    screen.getByText('usb-1')
    screen.getByAltText('magneticModuleV1')
  })
  it('renders information for a temperature module with mocked status', () => {
    vi.mocked(TemperatureModuleData).mockReturnValue(
      <div>Mock Temperature Module Data</div>
    )

    render({
      ...props,
      module: mockTemperatureModuleGen2,
    })
    screen.getByText('Temperature Module GEN2')
    screen.getByText('Mock Temperature Module Data')
    screen.getByText('usb-1')
    screen.getByAltText('temperatureModuleV2')
  })

  it('renders information for a thermocycler module with mocked status', () => {
    render({
      ...props,
      module: mockThermocycler,
    })

    screen.getByText('Thermocycler Module GEN1')
    screen.getByText('Mock Thermocycler Module Data')
    screen.getByText('usb-1')
    screen.getByAltText('thermocyclerModuleV1')
  })

  it('renders information for a heater shaker module with mocked status', () => {
    vi.mocked(getIsHeaterShakerAttached).mockReturnValue(true)
    render({
      ...props,
      module: mockHeaterShaker,
    })

    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Mock Heater Shaker Module Data')
    screen.getByText('usb-1')
    screen.getByAltText('heaterShakerModuleV1')
  })

  it('renders kebab icon, opens and closes overflow menu on click', () => {
    render({
      ...props,
      module: mockMagneticModule,
    })
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    screen.getByText('Magnetic Module GEN1')
    fireEvent.click(overflowButton)
    expect(overflowButton).not.toBeDisabled()
    const overflowMenu = screen.getByText('mock module overflow menu')
    fireEvent.click(overflowMenu)
    expect(screen.queryByText('mock module overflow menu')).toBeNull()
  })

  it('renders kebab icon and it is disabled when run is in progress', () => {
    when(useCurrentRunStatus).calledWith().thenReturn(RUN_STATUS_RUNNING)
    render({
      ...props,
      module: mockMagneticModule,
    })
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    screen.getByText('Magnetic Module GEN1')
    expect(overflowButton).toBeDisabled()
  })

  it('renders information for a heater shaker module when it is hot, showing the too hot banner', () => {
    render({
      ...props,
      module: mockHotHeaterShaker,
    })
    screen.getByText(nestedTextMatcher('Module is hot to the touch'))
  })
  it('renders information success toast when update has completed', () => {
    vi.mocked(getRequestById).mockReturnValue({
      status: SUCCESS,
      response: {
        method: 'POST',
        ok: true,
        path: '/',
        status: 200,
      },
    })
    render({
      ...props,
      module: mockHotHeaterShaker,
    })
    expect(mockMakeToast).toBeCalled()
  })
  it('renders information when calibration is required so calibration update banner renders', () => {
    render({
      ...props,
      module: mockHotHeaterShaker,
    })
    screen.getByText('Module calibration required.')
  })
  it('does not render calibration update banner for OT-2-specific modules', () => {
    render({
      ...props,
      module: mockMagneticModule,
    })
    expect(
      screen.queryByText('Module calibration required.')
    ).not.toBeInTheDocument()
  })
  it('renders information when a firmware update is available so firmware update banner renders', () => {
    render({
      ...props,
      module: mockHotThermo,
    })
    screen.getByText('Firmware update available.')
    const button = screen.getByText('Update now')
    fireEvent.click(button)
    expect(vi.mocked(getRequestById)).toHaveBeenCalled()
  })
  it('renders information for update available and it fails rendering the fail modal', () => {
    vi.mocked(getRequestById).mockReturnValue({
      status: FAILURE,
      response: {
        method: 'POST',
        ok: false,
        path: '/',
        status: 500,
      },
      error: { message: 'ruh roh' },
    })
    render({
      ...props,
      module: mockHotThermo,
    })
    screen.getByText('Firmware update available.')
    const button = screen.getByText('Update now')
    fireEvent.click(button)
    expect(vi.mocked(getRequestById)).toHaveBeenCalled()
    expect(screen.getByText('mock firmware update failed modal')).toBeVisible()
  })
  it('renders information for update available and updating now text shows up when update is in progress', () => {
    vi.mocked(getRequestById).mockReturnValue({
      status: PENDING,
    })
    render({
      ...props,
      module: mockMagneticModuleHub,
    })
    expect(screen.getByText('Updating firmware...')).toBeVisible()
    expect(screen.getByLabelText('ot-spinner')).toBeVisible()
  })

  it('renders information for a thermocycler module gen 2 when it is hot, showing the too hot banner', () => {
    render({
      ...props,
      module: mockHotThermoGen2,
    })
    screen.getByText(nestedTextMatcher('Module is hot to the touch'))
    screen.getByAltText('thermocyclerModuleV2')
  })

  it('renders information for a thermocycler module gen 1 when it is hot, showing the too hot banner', () => {
    render({
      ...props,
      module: mockHotThermo,
    })
    screen.getByText(nestedTextMatcher('Module is hot to the touch'))
    screen.getByAltText('thermocyclerModuleV1')
  })

  it('renders information for a heater shaker module with an error', () => {
    vi.mocked(ErrorInfo).mockReturnValue(<div>mock heater shaker error</div>)
    vi.mocked(getIsHeaterShakerAttached).mockReturnValue(true)
    render({
      ...props,
      module: mockHeaterShaker,
    })

    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Mock Heater Shaker Module Data')
    screen.getByText('mock heater shaker error')
  })
})
