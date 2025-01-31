import { describe, it, beforeEach, vi, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'

import { ListButtonRadioButton } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ListButtonRadioButton>) =>
  renderWithProviders(<ListButtonRadioButton {...props} />)

describe('ListButtonRadioButton', () => {
  let props: ComponentProps<typeof ListButtonRadioButton>

  beforeEach(() => {
    props = {
      buttonText: 'mock text',
      buttonValue: 'mockValue',
      onChange: vi.fn(),
    }
  })

  it('should render non nested accordion', () => {
    render(props)
    fireEvent.click(screen.getByText('mock text'))
    expect(props.onChange).toHaveBeenCalled()
  })
})
