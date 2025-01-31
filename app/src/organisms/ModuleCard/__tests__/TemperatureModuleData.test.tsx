import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { StatusLabel } from '/app/atoms/StatusLabel'
import { TemperatureModuleData } from '../TemperatureModuleData'
import { mockTemperatureModuleGen2 } from '/app/redux/modules/__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('/app/atoms/StatusLabel')

const render = (props: ComponentProps<typeof TemperatureModuleData>) => {
  return renderWithProviders(<TemperatureModuleData {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TemperatureModuleData', () => {
  let props: ComponentProps<typeof TemperatureModuleData>
  beforeEach(() => {
    props = {
      moduleStatus: mockTemperatureModuleGen2.data.status,
      targetTemp: mockTemperatureModuleGen2.data.targetTemperature,
      currentTemp: mockTemperatureModuleGen2.data.currentTemperature,
    }
    vi.mocked(StatusLabel).mockReturnValue(<div>Mock StatusLabel</div>)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders an idle status', () => {
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: C_SILVER_GRAY'
    )
  })

  it('renders a holding at target status', () => {
    props = {
      moduleStatus: 'holding at target',
      targetTemp: mockTemperatureModuleGen2.data.targetTemperature,
      currentTemp: mockTemperatureModuleGen2.data.currentTemperature,
    }
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: C_SKY_BLUE'
    )
  })

  it('renders a cooling status', () => {
    props = {
      moduleStatus: 'cooling',
      targetTemp: mockTemperatureModuleGen2.data.targetTemperature,
      currentTemp: mockTemperatureModuleGen2.data.currentTemperature,
    }
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: C_SKY_BLUE'
    )
  })

  it('renders a heating status', () => {
    props = {
      moduleStatus: 'heating',
      targetTemp: mockTemperatureModuleGen2.data.targetTemperature,
      currentTemp: mockTemperatureModuleGen2.data.currentTemperature,
    }
    render(props)
    expect(screen.getByText('Mock StatusLabel')).toHaveStyle(
      'backgroundColor: C_SKY_BLUE'
    )
  })

  it('renders correct temperature information when target temp is null', () => {
    render(props)
    screen.getByText('Target: N/A')
    screen.getByText(`Current: ${props.currentTemp} °C`)
  })

  it('renders correct temperature information when target temp is not null', () => {
    props = {
      moduleStatus: mockTemperatureModuleGen2.data.status,
      targetTemp: 34,
      currentTemp: mockTemperatureModuleGen2.data.currentTemperature,
    }
    render(props)
    screen.getByText(`Target: ${String(props.targetTemp)} °C`)
    screen.getByText(`Current: ${props.currentTemp} °C`)
  })
})
