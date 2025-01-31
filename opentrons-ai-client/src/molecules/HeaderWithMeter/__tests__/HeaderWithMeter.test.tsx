import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { HeaderWithMeter } from '../index'
import { describe, expect, it, vi } from 'vitest'
import {
  screen,
  render as rtlRender,
  waitFor,
  fireEvent,
} from '@testing-library/react'
import { ExitConfirmModal } from '../../ExitConfirmModal'

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}))

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<HeaderWithMeter progressPercentage={0.3} />, {
    i18nInstance: i18n,
  })
}

describe('HeaderWithMeter', () => {
  it('should render Header component', () => {
    render()
    screen.getByText('Opentrons')
  })

  it('should render progress bar', () => {
    render()
    screen.getByRole('progressbar')
  })

  it('should render progress bar with correct value', () => {
    render()
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('value', '0.3')
  })

  it('should update when progressPercentage prop changes', () => {
    const { rerender } = rtlRender(
      <HeaderWithMeter progressPercentage={0.3} />,
      {}
    )

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('value', '0.3')

    rerender(<HeaderWithMeter progressPercentage={0.6} />)
    expect(progressBar).toHaveAttribute('value', '0.6')

    rerender(<HeaderWithMeter progressPercentage={1} />)
    expect(progressBar).toHaveAttribute('value', '1')

    rerender(<HeaderWithMeter progressPercentage={0} />)
    expect(progressBar).toHaveAttribute('value', '0')

    rerender(<HeaderWithMeter progressPercentage={0.2} />)
    expect(progressBar).toHaveAttribute('value', '0.2')
  })

  it('should display the exit button instead of the logout button', () => {
    render()
    screen.getByText('Exit')
  })

  it('should display the exit confirm modal when exit button is clicked', async () => {
    renderWithProviders(
      <>
        <HeaderWithMeter progressPercentage={0.3} />
        <ExitConfirmModal />
      </>,
      {
        i18nInstance: i18n,
      }
    )

    const exitButton = screen.getByText('Exit')

    fireEvent.click(exitButton)

    await waitFor(() => {
      screen.getByText('Are you sure you want to exit?')
    })
  })
})
