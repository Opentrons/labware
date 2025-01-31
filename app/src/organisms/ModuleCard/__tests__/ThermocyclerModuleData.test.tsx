import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockThermocycler,
  mockThermocyclerGen2,
} from '/app/redux/modules/__fixtures__'
import { ThermocyclerModuleData } from '../ThermocyclerModuleData'

import type { ComponentProps } from 'react'
import type { ThermocyclerData } from '/app/redux/modules/api-types'

const render = (props: ComponentProps<typeof ThermocyclerModuleData>) => {
  return renderWithProviders(<ThermocyclerModuleData {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockDataBase = {
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
}

const mockDataHoldingAtTarget = {
  ...mockDataBase,
  status: 'holding at target',
} as ThermocyclerData

const mockDataCooling = {
  ...mockDataBase,
  status: 'cooling',
} as ThermocyclerData

const mockDataHeating = {
  ...mockDataBase,
  status: 'heating',
} as ThermocyclerData

describe('ThermocyclerModuleData', () => {
  let props: ComponentProps<typeof ThermocyclerModuleData>
  beforeEach(() => {
    props = {
      data: mockThermocycler.data,
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders an idle block temp status', () => {
    render(props)

    expect(screen.getByTestId('status_label_idle_blockStatus')).toHaveStyle(
      'backgroundColor: C_SILVER_GRAY'
    )
  })

  it('renders a block temp holding at target status', () => {
    props = {
      data: mockDataHoldingAtTarget,
    }
    render(props)

    expect(
      screen.getByTestId('status_label_holding at target_blockStatus')
    ).toHaveStyle('backgroundColor: C_SKY_BLUE')
  })

  it('renders a block temp cooling status', () => {
    props = {
      data: mockDataCooling,
    }
    render(props)

    expect(screen.getByTestId('status_label_cooling_blockStatus')).toHaveStyle(
      'backgroundColor: C_SKY_BLUE'
    )
  })

  it('renders a block temp heating status', () => {
    props = {
      data: mockDataHeating,
    }
    render(props)

    expect(screen.getByTestId('status_label_heating_blockStatus')).toHaveStyle(
      'backgroundColor: C_SKY_BLUE'
    )
  })

  it('renders an error status', () => {
    props = {
      data: mockDataHeating,
    }
    render(props)

    expect(screen.getByTestId('status_label_heating_blockStatus')).toHaveStyle(
      'backgroundColor: COLORS.yellow20'
    )
  })

  it('renders thermocycler gen 1 lid temperature data with lid opened', () => {
    render(props)

    screen.getByText('Lid')
    screen.getByTitle('lid_target_temp')
    screen.getByTitle('lid_temp')
    screen.getByTestId('status_label_open_lidStatus')
  })

  it('renders thermocycler gen 1 lid temperature data with lid closed', () => {
    props = {
      data: {
        lidStatus: 'closed',
        lidTargetTemperature: null,
        lidTemperatureStatus: 'idle',
        lidTemperature: null,
        currentTemperature: null,
        targetTemperature: null,
        holdTime: null,
        rampRate: null,
        currentCycleIndex: null,
        totalCycleCount: null,
        currentStepIndex: null,
        totalStepCount: null,
        status: 'idle',
      } as ThermocyclerData,
    }
    render(props)

    screen.getByText('Lid')
    screen.getByTitle('lid_target_temp')
    screen.getByTitle('lid_temp')
    screen.getByTestId('status_label_closed_lidStatus')
  })

  it('renders thermocycler gen 1 lid temperature data with lid temp status cooling', () => {
    props = {
      data: {
        lidTemperatureStatus: 'cooling',
      } as ThermocyclerData,
    }
    render(props)
    expect(
      screen.getByTestId('status_label_cooling_lidTempStatus')
    ).toHaveStyle('backgroundColor: C_SKY_BLUE')
  })

  it('renders thermocycler gen 1 lid temperature data with lid temp status heating', () => {
    props = {
      data: {
        lidTemperatureStatus: 'heating',
      } as ThermocyclerData,
    }
    render(props)
    expect(
      screen.getByTestId('status_label_heating_lidTempStatus')
    ).toHaveStyle('backgroundColor: C_SKY_BLUE')
  })

  it('renders thermocycler gen 1 lid temperature data with lid temp status holding at temperature', () => {
    props = {
      data: {
        lidTemperatureStatus: 'holding at target',
      } as ThermocyclerData,
    }
    render(props)
    expect(
      screen.getByTestId('status_label_holding at target_lidTempStatus')
    ).toHaveStyle('backgroundColor: C_SKY_BLUE')
  })

  it('renders thermocycler gen 1 block temperature data', () => {
    render(props)

    screen.getByText('Block')
    screen.getByTitle('tc_target_temp')
    screen.getByTitle('tc_current_temp')
  })

  it('renders all 3 of the thermocycler gen 2 status labels', () => {
    props = {
      data: mockThermocyclerGen2.data,
    }
    render(props)
    expect(screen.getByTestId('status_label_open_lidStatus')).toHaveStyle(
      'backgroundColor: C_SILVER_GRAY'
    )
    expect(screen.getByTestId('status_label_idle_lidTempStatus')).toHaveStyle(
      'backgroundColor: C_SILVER_GRAY'
    )
    expect(screen.getByTestId('status_label_idle_blockStatus')).toHaveStyle(
      'backgroundColor: C_SILVER_GRAY'
    )
  })

  it('renders thermocycler lid status to say open even though the status is in_between', () => {
    props = {
      data: {
        lidStatus: 'in_between',
      } as ThermocyclerData,
    }
    render(props)
    screen.getByTestId('status_label_open_lidStatus')
  })
})
