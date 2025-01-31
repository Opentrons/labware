import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ANALYTICS_LANGUAGE_UPDATED_ODD_UNBOXING_FLOW } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { updateConfigValue, getAppLanguage } from '/app/redux/config'
import { ChooseLanguage } from '..'

import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})
vi.mock('/app/redux/config')
vi.mock('/app/redux-resources/analytics')

const mockTrackEvent = vi.fn()

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <ChooseLanguage />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ChooseLanguage', () => {
  beforeEach(() => {
    vi.mocked(useTrackEventWithRobotSerial).mockReturnValue({
      trackEventWithRobotSerial: mockTrackEvent,
    })
    vi.mocked(getAppLanguage).mockReturnValue('en-US')
  })
  it('should render text, language options, and continue button', () => {
    render()
    screen.getByText('Choose your language')
    screen.getByText('Select a language to personalize your experience.')
    screen.getByRole('label', { name: 'English (US)' })
    screen.getByRole('label', { name: '中文' })
    screen.getByRole('button', { name: 'Continue' })
  })

  it('should initialize english', () => {
    render()
    expect(updateConfigValue).toBeCalledWith('language.appLanguage', 'en-US')
  })

  it('should change language when language option selected', () => {
    render()
    fireEvent.click(screen.getByRole('label', { name: '中文' }))
    expect(updateConfigValue).toBeCalledWith('language.appLanguage', 'zh-CN')
  })

  it('should call mockNavigate when tapping continue', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_LANGUAGE_UPDATED_ODD_UNBOXING_FLOW,
      properties: {
        language: 'en-US',
      },
    })
    expect(mockNavigate).toHaveBeenCalledWith('/welcome')
  })
})
