import { describe, it, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'
import { Toolbox } from '../index'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Toolbox>) => {
  return renderWithProviders(<Toolbox {...props} />)
}

describe('Toolbox', () => {
  let props: ComponentProps<typeof Toolbox>

  it('should render text and buttons', () => {
    props = {
      title: <div>mock header</div>,
      children: <div>mock children</div>,
      confirmButtonText: 'done',
      onCloseClick: vi.fn(),
      closeButton: <div>exit</div>,
      onConfirmClick: vi.fn(),
      secondaryHeaderButton: <div>mock secondary header button</div>,
    }
    render(props)
    screen.getByText('mock header')
    screen.getByText('done')
    fireEvent.click(screen.getByTestId('Toolbox_confirmButton'))
    expect(props.onConfirmClick).toHaveBeenCalled()
    screen.getByText('mock children')
    screen.getByText('exit')
    fireEvent.click(screen.getByTestId('Toolbox_closeButton'))
    expect(props.onCloseClick).toHaveBeenCalled()
    screen.getByText('mock secondary header button')
  })
})
