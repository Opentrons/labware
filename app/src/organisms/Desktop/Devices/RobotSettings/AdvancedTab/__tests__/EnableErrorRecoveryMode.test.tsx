import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useErrorRecoverySettingsToggle } from '/app/resources/errorRecovery'
import { EnableErrorRecoveryMode } from '../EnableErrorRecoveryMode'
import type { ComponentProps } from 'react'

vi.mock('/app/resources/errorRecovery')

const mockToggleERSettings = vi.fn()
const render = (props: ComponentProps<typeof EnableErrorRecoveryMode>) => {
  return renderWithProviders(<EnableErrorRecoveryMode {...props} />, {
    i18nInstance: i18n,
  })
}

describe('EnableErrorRecoveryMode', () => {
  let props: ComponentProps<typeof EnableErrorRecoveryMode>

  beforeEach(() => {
    props = { isRobotBusy: false }

    vi.mocked(useErrorRecoverySettingsToggle).mockReturnValue({
      isEREnabled: false,
      toggleERSettings: mockToggleERSettings,
    })
  })

  it('should render text and toggle button', () => {
    render(props)
    screen.getByText('Recovery mode')
    screen.getByText('Pause on protocol errors instead of canceling the run.')
    expect(
      screen.getByLabelText('enable_error_recovery_mode')
    ).toBeInTheDocument()
  })

  it('should call a mock function when clicking toggle button', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('enable_error_recovery_mode'))
    expect(mockToggleERSettings).toHaveBeenCalled()
  })

  it('should disable the toggle if the robot is busy', () => {
    render({ isRobotBusy: true })
    expect(screen.getByLabelText('enable_error_recovery_mode')).toBeDisabled()
  })
})
