import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ErrorInfo } from '../ErrorInfo'
import {
  mockHeaterShaker,
  mockTemperatureModule,
  mockThermocycler,
} from '/app/redux/modules/__fixtures__'

import type { ComponentProps } from 'react'
import type {
  HeaterShakerModule,
  ThermocyclerModule,
} from '/app/redux/modules/types'

const mockErrorThermocycler = {
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
    status: 'error',
  },
  usbPort: {
    path: '/dev/ot_module_thermocycler0',
    port: 1,
    hub: false,
    portGroup: 'unknown',
  },
} as ThermocyclerModule

const mockErrorHeaterShaker = {
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
    errorDetails: 'errorDetails',
    status: 'error',
  },
  usbPort: {
    path: '/dev/ot_module_heatershaker0',
    hub: false,
    port: 1,
    portGroup: 'unknown',
  },
} as HeaterShakerModule

const render = (props: ComponentProps<typeof ErrorInfo>) => {
  return renderWithProviders(<ErrorInfo {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ErrorInfo', () => {
  let props: ComponentProps<typeof ErrorInfo>
  beforeEach(() => {
    props = {
      attachedModule: mockTemperatureModule,
    }
  })

  it('returns null if attachedModule is not a TC or HS', () => {
    render(props)
    expect(screen.queryByText('Module error')).toBeNull()
  })

  it('returns null if attachedModule is a HS is not in error', () => {
    props = {
      attachedModule: mockHeaterShaker,
    }
    render(props)
    expect(screen.queryByText('Module error')).toBeNull()
  })

  it('returns null if attachedModule is a TC is not in error', () => {
    props = {
      attachedModule: mockThermocycler,
    }
    render(props)
    expect(screen.queryByText('Module error')).toBeNull()
  })

  it('returns correct info for a HS in error', () => {
    props = {
      attachedModule: mockErrorHeaterShaker,
    }
    render(props)
    screen.getByText('Module error')
    const btn = screen.getByLabelText('view_error_details')
    screen.getByText('View')
    screen.getByText('error details')
    fireEvent.click(btn)
    screen.getByText('Heater-Shaker Module GEN1 error')
    screen.getByText('errorDetails')
    screen.getByText(
      'Try powering the module off and on again. If the error persists, contact Opentrons Support.'
    )
    const close = screen.getByRole('button', { name: 'close' })
    fireEvent.click(close)
    expect(screen.queryByText('Heater-Shaker Module GEN1 error')).toBeNull()
  })

  it('returns correct info for a TC in error', () => {
    props = {
      attachedModule: mockErrorThermocycler,
    }
    render(props)
    screen.getByText('Module error')
    const btn = screen.getByLabelText('view_error_details')
    screen.getByText('View')
    screen.getByText('error details')
    fireEvent.click(btn)
    screen.getByText('Thermocycler Module GEN1 error')
    screen.getByText(
      'Try powering the module off and on again. If the error persists, contact Opentrons Support.'
    )
    const close = screen.getByRole('button', { name: 'close' })
    fireEvent.click(close)
    expect(screen.queryByText('Thermocycler Module GEN1 error')).toBeNull()
  })
})
