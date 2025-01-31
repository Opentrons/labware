import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockCircularLabwareWellGroupProperties } from '/app/redux/custom-labware/__fixtures__'
import { WellProperties } from '../WellProperties'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof WellProperties>) => {
  return renderWithProviders(<WellProperties {...props} />, {
    i18nInstance: i18n,
  })
}

describe('WellProperties', () => {
  let props: ComponentProps<typeof WellProperties>
  beforeEach(() => {
    props = {
      wellProperties: mockCircularLabwareWellGroupProperties,
      wellLabel: 'mockLabel',
      displayVolumeUnits: 'mL',
    }
  })

  it('renders correct heading and label when wellBottomShape exists', () => {
    render(props)

    screen.getByRole('heading', { name: 'max volume' })
    screen.getByText('0.01 mL')
    screen.getByRole('heading', { name: 'mockLabel shape' })
    screen.getByText('Flat_Bottom')
  })

  it('does not render wellBottomShape section when wellBottomShape is null', () => {
    props.wellProperties.metadata.wellBottomShape = undefined
    render(props)

    expect(
      screen.queryByRole('heading', { name: 'mockLabel shape' })
    ).not.toBeInTheDocument()
  })

  it('renders correct label when volume is null', () => {
    props.wellProperties.totalLiquidVolume = null
    render(props)

    expect(screen.queryByText('0.01 mL')).not.toBeInTheDocument()
    screen.getByText('various')
  })
})
