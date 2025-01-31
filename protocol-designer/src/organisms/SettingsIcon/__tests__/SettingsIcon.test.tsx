import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../__testing-utils__'
import { getFileMetadata } from '../../../file-data/selectors'
import { SettingsIcon } from '..'

import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      location: {
        pathname: '/settings',
      },
    }),
  }
})
vi.mock('../../../file-data/selectors')

const render = () => {
  return renderWithProviders(<SettingsIcon />)[0]
}

describe('SettingsIcon', () => {
  beforeEach(() => {
    vi.mocked(getFileMetadata).mockReturnValue({})
  })
  it('renders the SettingsIcon', () => {
    render()
    fireEvent.click(screen.getByTestId('SettingsIconButton'))
    expect(mockNavigate).toHaveBeenCalled()
  })
})
