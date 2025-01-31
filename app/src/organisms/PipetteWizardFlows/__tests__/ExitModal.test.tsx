import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { FLOWS } from '../constants'
import { ExitModal } from '../ExitModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ExitModal>) => {
  return renderWithProviders(<ExitModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ExitModal', () => {
  let props: ComponentProps<typeof ExitModal>

  beforeEach(() => {
    props = {
      goBack: vi.fn(),
      proceed: vi.fn(),
      flowType: FLOWS.CALIBRATE,
      isOnDevice: false,
    }
  })
  it('returns the correct information for exit modal for calibration flow', () => {
    render(props)
    screen.getByText('Pipette Calibration progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Pipette Calibration?'
    )
    const back = screen.getByRole('button', { name: 'Go back' })
    const exit = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })

  it('returns the correct information for exit modal for attach flow', () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
    }
    render(props)
    screen.getByText('Attaching Pipette progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Attaching Pipette?'
    )
    const back = screen.getByRole('button', { name: 'Go back' })
    const exit = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })

  it('returns the correct information for exit modal for detach flow', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
    }
    render(props)
    screen.getByText('Detaching Pipette progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Detaching Pipette?'
    )
    const back = screen.getByRole('button', { name: 'Go back' })
    const exit = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })
  it('renders the correct buttons for on device display', () => {
    props = {
      ...props,
      isOnDevice: true,
    }
    render(props)
    screen.getByText('Pipette Calibration progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Pipette Calibration?'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(props.proceed).toHaveBeenCalled()
  })
})
