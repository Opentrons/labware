import { screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ReactQueryDevtools } from '/app/App/tools'
import { useFeatureFlag } from '/app/redux/config'

vi.mock('react-query/devtools/development', () => ({
  ReactQueryDevtools: vi
    .fn()
    .mockReturnValue(<div>MOCK_REACT_QUERY_DEVTOOLS</div>),
}))
vi.mock('/app/redux/config')

const render = () => {
  return renderWithProviders(<ReactQueryDevtools />, {
    i18nInstance: i18n,
  })
}

describe('ReactQueryDevtools', () => {
  const mockUseFF = vi.fn()

  beforeEach(() => {
    vi.mocked(useFeatureFlag).mockReturnValue(true)
  })

  it('uses the correct feature flag', () => {
    vi.mocked(useFeatureFlag).mockImplementation(mockUseFF)

    render()

    expect(mockUseFF).toHaveBeenCalledWith('reactQueryDevtools')
  })

  it('renders the devtools if the FF is enabled', async () => {
    render()

    await screen.findByText('MOCK_REACT_QUERY_DEVTOOLS')
  })

  it('does not the devtools if the FF is disabled', async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false)

    render()

    expect(
      screen.queryByText('MOCK_REACT_QUERY_DEVTOOLS')
    ).not.toBeInTheDocument()
  })
})
