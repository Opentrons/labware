import { vi, it, describe, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { setUseTrashSurfaceForTipCal } from '/app/redux/calibration'
import { AskForCalibrationBlockModal } from '../AskForCalibrationBlockModal'

import type { ComponentProps } from 'react'

describe('AskForCalibrationBlockModal', () => {
  const onResponse = vi.fn()
  const render = () => {
    return renderWithProviders<
      ComponentProps<typeof AskForCalibrationBlockModal>
    >(
      <AskForCalibrationBlockModal
        onResponse={onResponse}
        titleBarTitle="Test Cal Flow"
        closePrompt={vi.fn()}
      />,
      { i18nInstance: i18n }
    )
  }

  it('saves preference when not checked and use trash is clicked', () => {
    const { dispatch } = render()[1]
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    const button = screen.getByRole('button', { name: 'Use trash bin' })
    fireEvent.click(button)
    expect(dispatch).not.toHaveBeenCalled()
    expect(onResponse).toHaveBeenCalledWith(false)
  })
  it('does not save preference when not checked and use trash is clicked', () => {
    const { dispatch } = render()[1]
    const button = screen.getByRole('button', { name: 'Use Calibration Block' })
    fireEvent.click(button)
    expect(dispatch).toHaveBeenCalledWith(setUseTrashSurfaceForTipCal(false))
    expect(onResponse).toHaveBeenCalledWith(true)
  })
  it('saves preference when not checked and use block is clicked', () => {
    const { dispatch } = render()[1]
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    const button = screen.getByRole('button', { name: 'Use trash bin' })
    fireEvent.click(button)
    expect(dispatch).not.toHaveBeenCalled()
    expect(onResponse).toHaveBeenCalledWith(false)
  })
  it('does not save preference when not checked and use block is clicked', () => {
    const { dispatch } = render()[1]
    const button = screen.getByRole('button', { name: 'Use Calibration Block' })
    fireEvent.click(button)
    expect(dispatch).toHaveBeenCalledWith(setUseTrashSurfaceForTipCal(false))
    expect(onResponse).toHaveBeenCalledWith(true)
  })
})
