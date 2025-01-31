import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { WellOrderModal } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof WellOrderModal>) => {
  return renderWithProviders(<WellOrderModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('WellOrderModal', () => {
  let props: ComponentProps<typeof WellOrderModal>

  beforeEach(() => {
    props = {
      isOpen: true,
      closeModal: vi.fn(),
      prefix: 'aspirate',
      firstName: 'aspirate_wellOrder_l',
      secondName: 'aspirate_wellOrder_r',
      firstValue: null,
      secondValue: null,
      updateValues: vi.fn(),
    }
  })
  it('renders all the text and buttons for the modal with the default fields', () => {
    render(props)
    screen.getByText('Edit well order')
    screen.getByText('Change how the robot moves from well to well.')
    screen.getByText('Primary order')
    screen.getByText('then')
    screen.getByText('Secondary order')
    fireEvent.click(screen.getByText('Reset to default'))
    expect(props.closeModal).toHaveBeenCalled()
    expect(props.updateValues).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.closeModal).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Save'))
    expect(props.closeModal).toHaveBeenCalled()
    expect(props.updateValues).toHaveBeenCalled()
  })
})
