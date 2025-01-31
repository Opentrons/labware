import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { mockHeaterShaker } from '/app/redux/modules/__fixtures__'
import { i18n } from '/app/i18n'
import { HeaterShakerModuleCard } from '../HeaterShakerModuleCard'
import { HeaterShakerModuleData } from '/app/organisms/ModuleCard/HeaterShakerModuleData'

import type { ComponentProps } from 'react'

vi.mock('/app/organisms/ModuleCard/HeaterShakerModuleData')

const render = (props: ComponentProps<typeof HeaterShakerModuleCard>) => {
  return renderWithProviders(<HeaterShakerModuleCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HeaterShakerModuleCard', () => {
  let props: ComponentProps<typeof HeaterShakerModuleCard>
  beforeEach(() => {
    props = {
      module: mockHeaterShaker,
    }
    vi.mocked(HeaterShakerModuleData).mockReturnValue(
      <div>mock heater shaker module data</div>
    )
  })

  it('renders the correct info', () => {
    render(props)
    screen.getByText('usb-1')
    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('mock heater shaker module data')
    screen.getByAltText('Heater-Shaker')
    screen.getByLabelText('heater-shaker')
  })
})
