import { COLORS, SPACING } from '@opentrons/components'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { ModuleIcon } from '../'

import type { ComponentProps } from 'react'
import type { AttachedModule } from '/app/redux/modules/types'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actualComponents,
    Tooltip: vi.fn(({ children }) => <div>{children}</div>),
  }
})

const render = (props: ComponentProps<typeof ModuleIcon>) => {
  return renderWithProviders(<ModuleIcon {...props} />)[0]
}

const mockTemperatureModule = {
  moduleModel: 'temperatureModuleV1',
  moduleType: 'temperatureModuleType',
  data: {},
} as AttachedModule

const mockMagneticModule = {
  moduleModel: 'magneticModuleV1',
  moduleType: 'magneticModuleType',
  data: {},
} as AttachedModule

const mockThermocyclerModule = {
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  data: {},
} as AttachedModule

const mockHeaterShakerModule = {
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  data: {},
} as AttachedModule

describe('ModuleIcon', () => {
  let props: ComponentProps<typeof ModuleIcon>

  beforeEach(() => {
    props = {
      module: mockTemperatureModule,
      tooltipText: 'mock ModuleIcon',
    }
  })

  it('renders SharedIcon with correct style', () => {
    render(props)
    const module = screen.getByTestId('ModuleIcon_ot-temperature-v2')
    expect(module).toHaveStyle(`color: ${COLORS.grey60}`)
    expect(module).toHaveStyle(`height: ${SPACING.spacing16}`)
    expect(module).toHaveStyle(`width: ${SPACING.spacing16}`)
    expect(module).toHaveStyle(`margin-left: ${SPACING.spacing2}`)
    expect(module).toHaveStyle(`margin-right: ${SPACING.spacing2}`)
  })

  it('renders magnetic module icon', () => {
    props.module = mockMagneticModule
    render(props)
    screen.getByTestId('ModuleIcon_ot-magnet-v2')
  })

  it('renders thermocycler module icon', () => {
    props.module = mockThermocyclerModule
    render(props)
    screen.getByTestId('ModuleIcon_ot-thermocycler')
  })

  it('renders heatershaker module icon', () => {
    props.module = mockHeaterShakerModule
    render(props)
    screen.getByTestId('ModuleIcon_ot-heater-shaker')
  })

  it('tooltip displays mock text message', () => {
    render(props)
    screen.getByText('mock ModuleIcon')
  })
})
