import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { CalibrationError } from '..'

import type { ComponentProps } from 'react'

describe('CalibrationError', () => {
  let props: ComponentProps<typeof CalibrationError>

  beforeEach(() => {
    props = {
      title: 'Error Title',
      subText: 'Error Description',
      onClose: vi.fn(),
    }
  })

  const render = (props: ComponentProps<typeof CalibrationError>) => {
    return renderWithProviders(<CalibrationError {...props} />, {
      i18nInstance: i18n,
    })[0]
  }

  it('displays expected copy', () => {
    render(props)

    screen.getByText('Error Title')
    screen.getByText('Error Description')
  })

  it('calls onClose when exit button is clicked', () => {
    render(props)

    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))

    expect(props.onClose).toHaveBeenCalled()
  })

  it('disables the exit button after it is clicked', () => {
    render(props)

    const exitButton = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(exitButton)

    expect(exitButton).toBeDisabled()
  })
})
