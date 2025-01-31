import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ConfirmCrashRecovery } from '../ConfirmCrashRecovery'

import type { ComponentProps } from 'react'

describe('ConfirmCrashRecovery', () => {
  const mockBack = vi.fn()
  const mockConfirm = vi.fn()
  const render = (
    props: Partial<ComponentProps<typeof ConfirmCrashRecovery>> = {}
  ) => {
    const { back = mockBack, confirm = mockConfirm } = props
    return renderWithProviders(
      <ConfirmCrashRecovery back={back} confirm={confirm} />,
      { i18nInstance: i18n }
    )
  }

  it('clicking resume goes back', () => {
    render()
    const button = screen.getByRole('button', { name: 'resume' })
    fireEvent.click(button)
    expect(mockBack).toHaveBeenCalled()
  })

  it('clicking start over confirms start over', () => {
    render()
    const button = screen.getByRole('button', { name: 'Start over' })
    fireEvent.click(button)
    expect(mockConfirm).toHaveBeenCalled()
  })

  it('renders correct copy', () => {
    render()
    screen.getByRole('heading', { name: 'Start over?' })
    screen.getByText('Starting over will cancel your calibration progress.')
    screen.getByText(
      'If you bent a tip, be sure to replace it with an undamaged tip in position A1 of the tip rack before resuming calibration.'
    )
  })
})
