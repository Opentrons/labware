import { describe, it, vi, beforeEach, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'
import { InputField } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof InputField>) => {
  return renderWithProviders(<InputField {...props} />)[0]
}

describe('HeaterShakerSlideout', () => {
  let props: ComponentProps<typeof InputField>
  beforeEach(() => {
    props = {
      type: 'number',
      caption: 'caption',
      max: 10,
      min: 1,
      units: 'rpm',
      value: '5',
      disabled: false,
      onFocus: vi.fn(),
      onBlur: vi.fn(),
      onChange: vi.fn(),
      readOnly: false,
      autoFocus: false,
    }
  })
  it('renders correct information when type is number', () => {
    render(props)
    screen.getByText('caption')
    screen.getByText('rpm')
  })
  it('renders correct information when type is text', () => {
    props = {
      type: 'text',
      value: 'string',
      units: 'C',
      onChange: vi.fn(),
    }
    render(props)
    screen.getByText('C')
  })
  it('renders error message when value is outside of number type range', () => {
    props = {
      type: 'number',
      caption: 'caption',
      max: 10,
      min: 1,
      units: 'rpm',
      value: '9',
      error: 'error',
      onChange: vi.fn(),
      id: 'input_id',
    }
    render(props)
    const input = screen.getByTestId('input_id')
    fireEvent.change(input, { target: { value: ['12'] } })
    expect(props.onChange).toHaveBeenCalled()
    screen.getByText('caption')
    screen.getByText('error')
  })
})
