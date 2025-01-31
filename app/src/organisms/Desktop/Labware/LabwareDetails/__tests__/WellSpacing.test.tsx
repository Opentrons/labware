import { screen } from '@testing-library/react'
import { describe, it, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockCircularLabwareWellGroupProperties } from '/app/redux/custom-labware/__fixtures__'
import { WellSpacing } from '../WellSpacing'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof WellSpacing>) => {
  return renderWithProviders(<WellSpacing {...props} />, {
    i18nInstance: i18n,
  })
}

describe('WellSpacing', () => {
  let props: ComponentProps<typeof WellSpacing>
  beforeEach(() => {
    props = {
      wellProperties: mockCircularLabwareWellGroupProperties,
    }
  })

  it('renders correct labels', () => {
    props.wellProperties = {
      ...props.wellProperties,
      xSpacing: 2.22227,
      ySpacing: 2.22227,
    }
    render(props)
    expect(screen.getAllByText('2.22')).toHaveLength(2)
  })

  it('renders correct labels when xSpacing and ySpacing have values', () => {
    render(props)

    screen.getByRole('heading', { name: 'x-offset' })
    screen.getByRole('heading', { name: 'y-offset' })
    screen.getByRole('heading', { name: 'x-spacing' })
    screen.getByRole('heading', { name: 'y-spacing' })
    expect(screen.getAllByText('1.00')).toHaveLength(4)
  })

  it('renders correct labels when xSpacing and ySpacing are null', () => {
    props.wellProperties = {
      ...props.wellProperties,
      xSpacing: null,
      ySpacing: null,
    }
    render(props)

    expect(screen.getAllByText('1.00')).toHaveLength(2)
    expect(screen.getAllByText('various')).toHaveLength(2)
  })
})
