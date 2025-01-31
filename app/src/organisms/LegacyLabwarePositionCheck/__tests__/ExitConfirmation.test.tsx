import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { ExitConfirmation } from '../ExitConfirmation'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ExitConfirmation>) => {
  return renderWithProviders(<ExitConfirmation {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ExitConfirmation', () => {
  let props: ComponentProps<typeof ExitConfirmation>

  beforeEach(() => {
    props = {
      onGoBack: vi.fn(),
      onConfirmExit: vi.fn(),
      shouldUseMetalProbe: false,
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should render correct copy', () => {
    render(props)
    screen.getByText('Exit before completing Labware Position Check?')
    screen.getByText(
      'If you exit now, all labware offsets will be discarded. This cannot be undone.'
    )
    screen.getByRole('button', { name: 'Exit' })
    screen.getByRole('button', { name: 'Go back' })
  })
  it('should invoke callback props when ctas are clicked', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.onGoBack).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(props.onConfirmExit).toHaveBeenCalled()
  })
  it('should render correct copy for golden tip LPC', () => {
    render({
      ...props,
      shouldUseMetalProbe: true,
    })
    screen.getByText('Remove the calibration probe before exiting')
    screen.getByText(
      'If you exit now, all labware offsets will be discarded. This cannot be undone.'
    )
    screen.getByRole('button', { name: 'Remove calibration probe' })
    screen.getByRole('button', { name: 'Go back' })
  })
})
