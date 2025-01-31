import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useErrorRecoveryBanner, ErrorRecoveryBanner } from '..'

import type { ComponentProps } from 'react'

vi.mock('..', async importOriginal => {
  const actualReact = await importOriginal<typeof useErrorRecoveryBanner>()
  return {
    ...actualReact,
    useErrorRecoveryBanner: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof ErrorRecoveryBanner>) => {
  return renderWithProviders(<ErrorRecoveryBanner {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ErrorRecoveryBanner', () => {
  beforeEach(() => {
    vi.mocked(useErrorRecoveryBanner).mockReturnValue({
      showRecoveryBanner: true,
      recoveryIntent: 'recovering',
    })
  })

  it('renders banner with correct content for recovering intent', () => {
    render({ recoveryIntent: 'recovering' })

    screen.getByText('Robot is in recovery mode')
    screen.getByText(
      'The robot’s touchscreen or another computer with the app is currently controlling this robot.'
    )
  })

  it('renders banner with correct content for canceling intent', () => {
    render({ recoveryIntent: 'canceling' })

    screen.getByText('Robot is canceling the run')
    screen.getByText(
      'The robot’s touchscreen or another computer with the app is currently controlling this robot.'
    )
  })
})
