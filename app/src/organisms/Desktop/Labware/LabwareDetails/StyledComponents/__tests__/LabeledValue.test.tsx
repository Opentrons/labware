import { screen } from '@testing-library/react'
import { describe, it, beforeEach } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { LabeledValue } from '../LabeledValue'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof LabeledValue>) => {
  return renderWithProviders(<LabeledValue {...props} />)
}

describe('LabeledValue', () => {
  let props: ComponentProps<typeof LabeledValue>
  beforeEach(() => {
    props = {
      label: 'height',
      value: '42',
    }
  })

  it('renders correct label heading', () => {
    render(props)

    screen.getByRole('heading', { name: 'height' })
  })

  it('renders correct value when value is a string', () => {
    render(props)

    screen.getByText('42')
  })

  it('renders correct value when value is a number', () => {
    props.value = 43
    render(props)

    screen.getByText('43')
  })
})
