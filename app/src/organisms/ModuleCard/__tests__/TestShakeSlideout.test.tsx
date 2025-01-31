import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getIsHeaterShakerAttached } from '/app/redux/config'
import { mockHeaterShaker } from '/app/redux/modules/__fixtures__'
import { useLatchControls } from '../hooks'
import { TestShakeSlideout } from '../TestShakeSlideout'
import { ModuleSetupModal } from '../ModuleSetupModal'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')
vi.mock('@opentrons/react-api-client')
vi.mock('../hooks')
vi.mock('../ModuleSetupModal')

const render = (props: ComponentProps<typeof TestShakeSlideout>) => {
  return renderWithProviders(<TestShakeSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockOpenLatchHeaterShaker = {
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

describe('TestShakeSlideout', () => {
  let props: ComponentProps<typeof TestShakeSlideout>
  let mockCreateLiveCommand = vi.fn()
  const mockToggleLatch = vi.fn()
  beforeEach(() => {
    props = {
      module: mockHeaterShaker,
      onCloseClick: vi.fn(),
      isExpanded: true,
    }
    vi.mocked(useLatchControls).mockReturnValue({
      toggleLatch: mockToggleLatch,
      isLatchClosed: true,
    } as any)
    mockCreateLiveCommand = vi.fn()
    mockCreateLiveCommand.mockResolvedValue(null)
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
    vi.mocked(getIsHeaterShakerAttached).mockReturnValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the slideout information banner icon and description', () => {
    render(props)
    screen.getByLabelText('information')
    screen.getByText(
      'If you want to add labware to the module before doing a test shake, you can use the labware latch controls to hold the latches open.'
    )
  })

  it('renders the labware latch open button', () => {
    render(props)
    screen.getByText('Labware Latch')
    screen.getByText('open')
    const button = screen.getByRole('button', { name: /Open Latch/i })
    expect(button).toBeEnabled()
  })

  it('renders a start button for speed setting', () => {
    render(props)

    screen.getByText('Shake speed')

    const button = screen.getByRole('button', { name: /Start/i })
    expect(button).toBeDisabled()
  })

  it('renders show attachment instructions link', () => {
    vi.mocked(ModuleSetupModal).mockReturnValue(<div>mockModuleSetupModal</div>)
    render(props)

    const button = screen.getByText('Show attachment instructions')
    fireEvent.click(button)
    screen.getByText('mockModuleSetupModal')
  })

  it('start shake button should be disabled if the labware latch is open', () => {
    props = {
      module: mockOpenLatchHeaterShaker,
      onCloseClick: vi.fn(),
      isExpanded: true,
    }
    vi.mocked(useLatchControls).mockReturnValue({
      toggleLatch: mockToggleLatch,
      isLatchClosed: false,
    })

    render(props)
    const button = screen.getByRole('button', { name: /Start/i })
    expect(button).toBeDisabled()
  })

  it('open latch button and input field should be disabled if the module is shaking', () => {
    props = {
      module: mockMovingHeaterShaker,
      onCloseClick: vi.fn(),
      isExpanded: true,
    }

    render(props)
    const button = screen.getByRole('button', { name: /Open/i })
    const input = screen.getByRole('spinbutton')
    expect(input).toBeDisabled()
    expect(button).toBeDisabled()
  })

  it('renders the open labware latch button and clicking it opens the latch', () => {
    props = {
      module: mockCloseLatchHeaterShaker,
      onCloseClick: vi.fn(),
      isExpanded: true,
    }

    render(props)
    const button = screen.getByRole('button', { name: /Open/i })
    fireEvent.click(button)
    expect(vi.mocked(useLatchControls)).toHaveBeenCalled()
  })

  it('entering an input for shake speed and clicking start should begin shaking', async () => {
    props = {
      module: mockHeaterShaker,
      onCloseClick: vi.fn(),
      isExpanded: true,
    }

    render(props)
    const button = screen.getByRole('button', { name: /Start/i })
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '300' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockCreateLiveCommand).toHaveBeenCalledWith({
        command: {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: {
            moduleId: 'heatershaker_id',
          },
        },
      })
    })
    await waitFor(() => {
      expect(mockCreateLiveCommand).toHaveBeenCalledWith({
        command: {
          commandType: 'heaterShaker/setAndWaitForShakeSpeed',
          params: {
            moduleId: 'heatershaker_id',
            rpm: 300,
          },
        },
      })
    })
  })
})
