import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import {
  i18n,
  US_ENGLISH_DISPLAY_NAME,
  US_ENGLISH,
  SIMPLIFIED_CHINESE_DISPLAY_NAME,
  SIMPLIFIED_CHINESE,
} from '/app/i18n'
import { ANALYTICS_LANGUAGE_UPDATED_ODD_SETTINGS } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { getAppLanguage, updateConfigValue } from '/app/redux/config'
import { renderWithProviders } from '/app/__testing-utils__'

import { LanguageSetting } from '../LanguageSetting'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')
vi.mock('/app/redux-resources/analytics')

const mockSetCurrentOption = vi.fn()
const mockTrackEvent = vi.fn()

const render = (props: ComponentProps<typeof LanguageSetting>) => {
  return renderWithProviders(<LanguageSetting {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LanguageSetting', () => {
  let props: ComponentProps<typeof LanguageSetting>
  beforeEach(() => {
    props = {
      setCurrentOption: mockSetCurrentOption,
    }
    vi.mocked(getAppLanguage).mockReturnValue(US_ENGLISH)
    vi.mocked(useTrackEventWithRobotSerial).mockReturnValue({
      trackEventWithRobotSerial: mockTrackEvent,
    })
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Language')
    screen.getByText(US_ENGLISH_DISPLAY_NAME)
    screen.getByText(SIMPLIFIED_CHINESE_DISPLAY_NAME)
  })

  it('should call mock function when tapping a language button', () => {
    render(props)
    const button = screen.getByText(SIMPLIFIED_CHINESE_DISPLAY_NAME)
    fireEvent.click(button)
    expect(updateConfigValue).toHaveBeenCalledWith(
      'language.appLanguage',
      SIMPLIFIED_CHINESE
    )
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_LANGUAGE_UPDATED_ODD_SETTINGS,
      properties: {
        language: SIMPLIFIED_CHINESE,
        transactionId: expect.anything(),
      },
    })
  })

  it('should call mock function when tapping back button', () => {
    render(props)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(props.setCurrentOption).toHaveBeenCalled()
  })
})
