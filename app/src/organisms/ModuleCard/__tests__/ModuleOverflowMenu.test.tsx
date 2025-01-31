import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockMagneticModule,
  mockTemperatureModuleGen2,
  mockThermocycler,
  mockHeaterShaker,
  mockThermocyclerGen2,
} from '/app/redux/modules/__fixtures__'
import { useIsLegacySessionInProgress } from '/app/resources/legacy_sessions'
import { useIsFlex } from '/app/redux-resources/robots'
import { useCurrentRunId, useRunStatuses } from '/app/resources/runs'
import { ModuleOverflowMenu } from '../ModuleOverflowMenu'

import type { ComponentProps } from 'react'
import type { TemperatureStatus } from '@opentrons/api-client'

vi.mock('/app/resources/legacy_sessions')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/runs')

const render = (props: ComponentProps<typeof ModuleOverflowMenu>) => {
  return renderWithProviders(<ModuleOverflowMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockMovingHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'speeding up',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1 },
} as any

const mockCloseLatchHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'idle',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1 },
} as any

const mockDeactivateHeatHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_open',
    speedStatus: 'idle',
    temperatureStatus: 'holding at target',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: 45,
    errorDetails: null,
    status: 'heating',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1 },
} as any

const mockTemperatureModuleHeating = {
  id: 'tempdeck_id',
  moduleModel: 'temperatureModuleV2',
  moduleType: 'temperatureModuleType',
  serialNumber: 'abc123',
  hardwareRevision: 'temp_deck_v20.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    currentTemp: 25,
    targetTemp: null,
    status: 'heating',
  },
  usbPort: { path: '/dev/ot_module_tempdeck0', port: 1 },
} as any

const mockMagDeckEngaged = {
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
    status: 'engaged',
  },
  usbPort: { path: '/dev/ot_module_magdeck0', port: 1 },
} as any

const mockTCBlockHeating = {
  id: 'thermocycler_id',
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  serialNumber: 'ghi789',
  hardwareRevision: 'thermocycler_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    lidStatus: 'open',
    lidTargetTemperature: null,
    lidTemperature: null,
    currentTemperature: null,
    targetTemperature: null,
    holdTime: null,
    rampRate: null,
    currentCycleIndex: null,
    totalCycleCount: null,
    currentStepIndex: null,
    totalStepCount: null,
    status: 'heating',
  },
  usbPort: { path: '/dev/ot_module_thermocycler0', port: 1 },
} as any

const mockThermocyclerGen2LidClosed = {
  id: 'thermocycler_id2',
  moduleModel: 'thermocyclerModuleV2',
  moduleType: 'thermocyclerModuleType',
  data: {
    lidStatus: 'closed',
  },
} as any

describe('ModuleOverflowMenu', () => {
  let props: ComponentProps<typeof ModuleOverflowMenu>
  beforeEach(() => {
    vi.mocked(useIsLegacySessionInProgress).mockReturnValue(false)
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: false,
      isRunStill: true,
      isRunTerminal: false,
      isRunIdle: false,
    })
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(useIsFlex).mockReturnValue(false)
    props = {
      robotName: 'otie',
      module: mockMagneticModule,
      handleSlideoutClick: vi.fn(),
      handleAboutClick: vi.fn(),
      handleTestShakeClick: vi.fn(),
      handleInstructionsClick: vi.fn(),
      handleCalibrateClick: vi.fn(),
      isLoadedInRun: false,
      isPipetteReady: true,
      isTooHot: false,
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the correct magnetic module menu', () => {
    render(props)
    screen.getByText('Set engage height')
    screen.getByText('About module')
  })

  it('renders the correct temperature module menu', () => {
    props = {
      ...props,
      module: mockTemperatureModuleGen2,
    }
    render(props)
    const buttonSetting = screen.getByRole('button', {
      name: 'Set module temperature',
    })
    fireEvent.click(buttonSetting)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    const buttonAbout = screen.getByRole('button', { name: 'About module' })
    fireEvent.click(buttonAbout)
    expect(props.handleAboutClick).toHaveBeenCalled()
  })
  it('renders the correct TC module menu', () => {
    props = {
      ...props,
      module: mockThermocycler,
    }
    render(props)
    const buttonSettingLid = screen.getByRole('button', {
      name: 'Set lid temperature',
    })
    fireEvent.click(buttonSettingLid)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    const buttonAbout = screen.getByRole('button', { name: 'About module' })
    fireEvent.click(buttonAbout)
    expect(props.handleAboutClick).toHaveBeenCalled()
    const buttonSettingBlock = screen.getByRole('button', {
      name: 'Set block temperature',
    })
    fireEvent.click(buttonSettingBlock)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    screen.getByRole('button', { name: 'Close lid' })
  })
  it('renders the correct Heater Shaker module menu', () => {
    props = {
      ...props,
      module: mockHeaterShaker,
    }
    render(props)
    screen.getByRole('button', {
      name: 'Set module temperature',
    })
    screen.getByRole('button', {
      name: 'Close labware latch',
    })
    const aboutButton = screen.getByRole('button', { name: 'About module' })
    screen.getByRole('button', { name: 'Show attachment instructions' })
    const testButton = screen.getByRole('button', { name: 'Test shake' })
    fireEvent.click(testButton)
    expect(props.handleTestShakeClick).toHaveBeenCalled()
    fireEvent.click(aboutButton)
    expect(props.handleAboutClick).toHaveBeenCalled()
  })
  it('renders heater shaker show attachment instructions button and when clicked, launches hs wizard', () => {
    props = {
      ...props,
      module: mockHeaterShaker,
    }
    render(props)
    const btn = screen.getByRole('button', {
      name: 'Show attachment instructions',
    })
    fireEvent.click(btn)
    expect(props.handleInstructionsClick).toHaveBeenCalled()
  })

  it('renders heater shaker labware latch button and is disabled when status is not idle', () => {
    props = {
      ...props,
      module: mockMovingHeaterShaker,
    }
    render(props)
    expect(
      screen.getByRole('button', {
        name: 'Open labware latch',
      })
    ).toBeDisabled()
  })

  it('renders heater shaker labware latch button and when clicked, moves labware latch open', () => {
    props = {
      ...props,
      module: mockCloseLatchHeaterShaker,
    }

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Open labware latch',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders heater shaker labware latch button and when clicked, moves labware latch close', () => {
    props = {
      ...props,
      module: mockHeaterShaker,
    }
    render(props)

    const btn = screen.getByRole('button', {
      name: 'Close labware latch',
    })

    fireEvent.click(btn)
  })

  it('renders heater shaker overflow menu and deactivates heater when status changes', () => {
    props = {
      ...props,
      module: mockDeactivateHeatHeaterShaker,
    }

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Deactivate heater',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders temperature module overflow menu and deactivates heat when status changes', () => {
    props = {
      ...props,
      module: mockTemperatureModuleHeating,
    }

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Deactivate module',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders magnetic module overflow menu and disengages when status changes', () => {
    props = {
      ...props,
      module: mockMagDeckEngaged,
    }

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Disengage module',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('renders thermocycler overflow menu and deactivates block when status changes', () => {
    props = {
      ...props,
      module: mockTCBlockHeating,
    }

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Deactivate block',
    })
    expect(btn).not.toBeDisabled()
    fireEvent.click(btn)
  })

  it('should disable module control buttons when the robot is busy and run status not null', () => {
    vi.mocked(useIsLegacySessionInProgress).mockReturnValue(true)
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: false,
      isRunStill: false,
      isRunTerminal: false,
      isRunIdle: true,
    })
    props = {
      ...props,
      module: mockTCBlockHeating,
      isLoadedInRun: true,
      runId: 'id',
    }

    render(props)

    const btn = screen.getByRole('button', {
      name: 'Deactivate block',
    })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
  })

  it('should disable overflow menu buttons for thermocycler gen 1 when the robot is a Flex', () => {
    props = {
      ...props,
      module: mockTCBlockHeating,
      isLoadedInRun: true,
      runId: 'id',
    }
    vi.mocked(useIsFlex).mockReturnValue(true)
    render(props)

    expect(
      screen.getByRole('button', {
        name: 'Set lid temperature',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Close lid',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Deactivate block',
      })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'About module',
      })
    ).toBeDisabled()
  })

  it('renders the correct Thermocycler gen 2 menu', () => {
    props = {
      ...props,
      module: mockThermocyclerGen2,
    }
    render(props)
    const setLid = screen.getByRole('button', {
      name: 'Set lid temperature',
    })
    screen.getByRole('button', {
      name: 'Close lid',
    })
    const setBlock = screen.getByRole('button', {
      name: 'Set block temperature',
    })
    const about = screen.getByRole('button', { name: 'About module' })
    fireEvent.click(setLid)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    fireEvent.click(setBlock)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    fireEvent.click(about)
    expect(props.handleAboutClick).toHaveBeenCalled()
  })

  it('renders the correct Thermocycler gen 2 menu with the lid closed', () => {
    props = {
      ...props,
      module: mockThermocyclerGen2LidClosed,
    }
    render(props)
    const setLid = screen.getByRole('button', {
      name: 'Set lid temperature',
    })
    screen.getByRole('button', {
      name: 'Open lid',
    })
    const setBlock = screen.getByRole('button', { name: 'Deactivate block' })
    const about = screen.getByRole('button', { name: 'About module' })
    fireEvent.click(setLid)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    fireEvent.click(setBlock)
    expect(props.handleSlideoutClick).toHaveBeenCalled()
    fireEvent.click(about)
    expect(props.handleAboutClick).toHaveBeenCalled()
  })

  it('renders the correct Thermocycler gen 2 menu with disabled buttons when run status is running', () => {
    vi.mocked(useCurrentRunId).mockReturnValue('123')
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: true,
      isRunStill: false,
      isRunTerminal: false,
      isRunIdle: false,
    })

    props = {
      ...props,
      module: mockThermocyclerGen2LidClosed,
    }
    render(props)
    const setLid = screen.getByRole('button', {
      name: 'Set lid temperature',
    })
    const changeLid = screen.getByRole('button', {
      name: 'Open lid',
    })
    const setBlock = screen.getByRole('button', { name: 'Deactivate block' })
    const about = screen.getByRole('button', { name: 'About module' })
    expect(setLid).toBeDisabled()
    expect(changeLid).toBeDisabled()
    expect(setBlock).toBeDisabled()
    expect(about).not.toBeDisabled()
  })

  it('not render calibrate button when a robot is OT-2', () => {
    props = {
      ...props,
      isPipetteReady: false,
    }
    render(props)

    const calibrate = screen.queryByRole('button', { name: 'Calibrate' })
    expect(calibrate).not.toBeInTheDocument()
  })

  it('renders a disabled calibrate button if the pipettes are not attached or need a firmware update', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    props = {
      ...props,
      module: mockHeaterShaker,
      isPipetteReady: false,
    }
    render(props)

    const calibrate = screen.getByRole('button', { name: 'Calibrate' })
    expect(calibrate).toBeDisabled()
  })

  it('renders a disabled calibrate button if module is too hot', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    props = {
      ...props,
      module: mockHeaterShaker,
      isTooHot: true,
    }
    render(props)

    const calibrate = screen.getByRole('button', { name: 'Calibrate' })
    expect(calibrate).toBeDisabled()
  })

  it('renders a disabled calibrate button if module is heating or cooling', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    const mockHeatingModule = {
      ...mockHeaterShaker,
      data: {
        ...mockHeaterShaker.data,
        temperatureStatus: 'heating' as TemperatureStatus,
      },
    }
    props = {
      ...props,
      module: mockHeatingModule,
    }
    render(props)

    const calibrate = screen.getByRole('button', { name: 'Calibrate' })
    expect(calibrate).toBeDisabled()
  })

  it('renders a disabled calibrate button if module temperature status errors', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    const mockHeatingModule = {
      ...mockHeaterShaker,
      data: {
        ...mockHeaterShaker.data,
        temperatureStatus: 'error' as TemperatureStatus,
      },
    }
    props = {
      ...props,
      module: mockHeatingModule,
    }
    render(props)

    const calibrate = screen.getByRole('button', { name: 'Calibrate' })
    expect(calibrate).toBeDisabled()
  })

  it('a mock function should be called when clicking Calibrate if pipette is ready', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    props = {
      ...props,
      module: mockHeaterShaker,
      isPipetteReady: true,
    }
    render(props)

    fireEvent.click(screen.getByRole('button', { name: 'Calibrate' }))
    expect(props.handleCalibrateClick).toHaveBeenCalled()
  })
})
