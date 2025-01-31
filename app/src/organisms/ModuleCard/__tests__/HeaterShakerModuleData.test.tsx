import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { StatusLabel } from '/app/atoms/StatusLabel'
import { HeaterShakerModuleData } from '../HeaterShakerModuleData'

import type { ComponentProps } from 'react'

vi.mock('/app/atoms/StatusLabel')

const render = (props: ComponentProps<typeof HeaterShakerModuleData>) => {
  return renderWithProviders(<HeaterShakerModuleData {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HeaterShakerModuleData', () => {
  let props: ComponentProps<typeof HeaterShakerModuleData>
  beforeEach(() => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'idle',
        currentSpeed: null,
        currentTemperature: null,
        targetSpeed: null,
        targetTemperature: null,
        errorDetails: null,
        status: 'idle',
      },
    }
    vi.mocked(StatusLabel).mockReturnValue(<div>Mock StatusLabel</div>)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders an idle status', () => {
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.grey30'
    )
  })

  it('renders a holding at target status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'holding at target',
        currentSpeed: 200,
        currentTemperature: null,
        targetSpeed: 200,
        targetTemperature: null,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: C_SKY_BLUE'
    )
  })

  it('renders a heating status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'heating',
        currentSpeed: null,
        currentTemperature: 39,
        targetSpeed: null,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.blue50'
    )
  })

  it('renders a shaking status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'speeding up',
        temperatureStatus: 'idle',
        currentSpeed: 200,
        currentTemperature: null,
        targetSpeed: 200,
        targetTemperature: null,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('Target: 200 rpm')
    screen.getByText('Current: 200 rpm')
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.blue50'
    )
  })

  it('renders an idle shaking status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'idle',
        currentSpeed: 0,
        currentTemperature: null,
        targetSpeed: null,
        targetTemperature: null,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('Target: N/A')
    screen.getByText('Current: 0 rpm')
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.grey30'
    )
  })

  it('renders an error shaking status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'error',
        temperatureStatus: 'idle',
        currentSpeed: 200,
        currentTemperature: null,
        targetSpeed: 200,
        targetTemperature: null,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('Target: 200 rpm')
    screen.getByText('Current: 200 rpm')
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.yellow20'
    )
  })

  it('renders an idle temp status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'idle',
        currentSpeed: 0,
        currentTemperature: null,
        targetSpeed: null,
        targetTemperature: null,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('Target: N/A')
    screen.getByText('Current: 0 rpm')
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.grey30'
    )
  })

  it('renders a cooling temp status', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'cooling',
        currentSpeed: null,
        currentTemperature: 60,
        targetSpeed: null,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: COLORS.blue50'
    )
  })

  it('renders a correct text when latch is opened', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_open',
        speedStatus: 'idle',
        temperatureStatus: 'cooling',
        currentSpeed: null,
        currentTemperature: 60,
        targetSpeed: null,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('open')
  })

  it('renders a correct text when latch is opening', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'opening',
        speedStatus: 'idle',
        temperatureStatus: 'cooling',
        currentSpeed: null,
        currentTemperature: 60,
        targetSpeed: null,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('open')
  })

  it('renders a correct text when latch is unknown', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'idle_unknown',
        speedStatus: 'idle',
        temperatureStatus: 'cooling',
        currentSpeed: null,
        currentTemperature: 60,
        targetSpeed: null,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('open')
  })

  it('renders a correct text when latch is closing and is not shaking', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'closing',
        speedStatus: 'idle',
        temperatureStatus: 'cooling',
        currentSpeed: null,
        currentTemperature: 60,
        targetSpeed: null,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('Closed')
  })

  it('renders a correct text when latch is closing and is shaking', () => {
    props = {
      moduleData: {
        labwareLatchStatus: 'closing',
        speedStatus: 'speeding up',
        temperatureStatus: 'cooling',
        currentSpeed: 200,
        currentTemperature: 60,
        targetSpeed: 500,
        targetTemperature: 42,
        errorDetails: null,
        status: 'idle',
      },
    }
    render(props)
    screen.getByText('Closed and Locked')
    screen.getByTestId('HeaterShakerModuleData_latch_lock')
  })

  it('renders correct information when status is idle', () => {
    render(props)
    screen.getByText('Target: N/A')
    screen.getByText('Labware Latch')
    screen.getByText(/Open/i)
  })
})
