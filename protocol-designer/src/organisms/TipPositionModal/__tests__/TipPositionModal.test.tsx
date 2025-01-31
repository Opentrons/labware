import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { TipPositionSideView } from '../TipPositionSideView'
import { TipPositionModal } from '..'

import type { ComponentProps } from 'react'

vi.mock('../TipPositionSideView')
const render = (props: ComponentProps<typeof TipPositionModal>) => {
  return renderWithProviders(<TipPositionModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockUpdateZSpec = vi.fn()
const mockUpdateXSpec = vi.fn()
const mockUpdateYSpec = vi.fn()

describe('TipPositionModal', () => {
  let props: ComponentProps<typeof TipPositionModal>

  beforeEach(() => {
    props = {
      prefix: 'aspirate',
      closeModal: vi.fn(),
      wellDepthMm: 50,
      wellXWidthMm: 10.3,
      wellYWidthMm: 10.5,
      isIndeterminate: false,
      specs: {
        z: {
          name: 'aspirate_mmFromBottom',
          value: null,
          updateValue: mockUpdateZSpec,
        },
        y: {
          name: 'aspirate_y_position',
          value: 0,
          updateValue: mockUpdateXSpec,
        },
        x: {
          name: 'aspirate_x_position',
          value: 0,
          updateValue: mockUpdateYSpec,
        },
      },
    }
    vi.mocked(TipPositionSideView).mockReturnValue(
      <div>mock TipPositionSideView</div>
    )
  })
  it('renders the modal text', () => {
    render(props)
    screen.getByText('Edit aspirate tip position')
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.closeModal).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Save'))
    expect(props.closeModal).toHaveBeenCalled()
    expect(mockUpdateXSpec).toHaveBeenCalled()
    expect(mockUpdateYSpec).toHaveBeenCalled()
    expect(mockUpdateZSpec).toHaveBeenCalled()
  })
  it('renders the alert if the x/y position values are too close to the max/min for x value', () => {
    props.specs.x.value = 9.7
    render(props)
    screen.getByText(
      'Tip position is close to the edge of the well and may cause collisions.'
    )
  })
  it('renders the alert if the x/y position values are too close to the max/min for y value', () => {
    props.specs.y.value = -9.7
    render(props)
    screen.getByText(
      'Tip position is close to the edge of the well and may cause collisions.'
    )
  })
  it('renders the captions, and visual', () => {
    render(props)
    screen.getByText('X position')
    screen.getByText('between -5.1 and 5.1')
    screen.getByText('Y position')
    screen.getByText('between -5.2 and 5.2')
    screen.getByText('Z position')
    screen.getByText('between 0 and 50')
    screen.getByText('mock TipPositionSideView')
  })
  it('renders a custom input field and clicks on it, calling the mock updates', () => {
    render(props)
    const xInputField = screen.getAllByRole('textbox', { name: '' })[0]
    fireEvent.change(xInputField, { target: { value: 3 } })
    const yInputField = screen.getAllByRole('textbox', { name: '' })[1]
    fireEvent.change(yInputField, { target: { value: -2 } })
    const zInputField = screen.getAllByRole('textbox', { name: '' })[2]
    fireEvent.change(zInputField, { target: { value: 10 } })
    fireEvent.click(screen.getByText('Save'))
    expect(props.closeModal).toHaveBeenCalled()
    expect(mockUpdateXSpec).toHaveBeenCalled()
    expect(mockUpdateYSpec).toHaveBeenCalled()
    expect(mockUpdateZSpec).toHaveBeenCalled()
  })
  it('renders custom input fields and displays error texts', () => {
    props = {
      ...props,
      specs: {
        z: {
          name: 'aspirate_mmFromBottom',
          value: 101,
          updateValue: mockUpdateZSpec,
        },
        y: {
          name: 'aspirate_y_position',
          value: -500,
          updateValue: mockUpdateXSpec,
        },
        x: {
          name: 'aspirate_x_position',
          value: 10.7,
          updateValue: mockUpdateYSpec,
        },
      },
    }
    render(props)
    fireEvent.click(screen.getByText('Save'))
    const xInputField = screen.getAllByRole('textbox', { name: '' })[0]
    fireEvent.change(xInputField, { target: { value: 3.55555 } })
    fireEvent.click(screen.getByText('Save'))
    //   display too many decimals error
    screen.getByText('a max of 1 decimal place is allowed')
  })
})
