import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { i18n } from '/app/i18n'
import {
  getOnDeviceDisplaySettings,
  updateConfigValue,
} from '/app/redux/config'
import { renderWithProviders } from '/app/__testing-utils__'
import { TouchscreenBrightness } from '../TouchscreenBrightness'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')

const mockFunc = vi.fn()

const render = (props: ComponentProps<typeof TouchscreenBrightness>) => {
  return renderWithProviders(<TouchscreenBrightness {...props} />, {
    i18nInstance: i18n,
  })
}

describe('TouchscreenBrightness', () => {
  let props: ComponentProps<typeof TouchscreenBrightness>

  beforeEach(() => {
    props = {
      setCurrentOption: mockFunc,
    }
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue({
      sleepMS: 1,
      brightness: 4,
      textSize: 1,
    } as any)
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Touchscreen Brightness')
    screen.getByTestId('TouchscreenBrightness_decrease')
    screen.getByTestId('TouchscreenBrightness_increase')
  })

  it('plus button should be disabled when brightness max(1)', () => {
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue({
      sleepMS: 1,
      brightness: 1,
      textSize: 1,
    } as any)
    render(props)
    const button = screen.getByTestId('TouchscreenBrightness_increase')
    expect(button).toBeDisabled()
  })

  it('plus button should be disabled when brightness min(6)', () => {
    vi.mocked(getOnDeviceDisplaySettings).mockReturnValue({
      sleepMS: 1,
      brightness: 6,
      textSize: 1,
    } as any)
    render(props)
    const button = screen.getByTestId('TouchscreenBrightness_decrease')
    expect(button).toBeDisabled()
  })

  it('should call mock function when tapping plus button', () => {
    render(props)
    const button = screen.getByTestId('TouchscreenBrightness_increase')
    fireEvent.click(button)
    expect(updateConfigValue).toHaveBeenCalled()
  })

  it('should call mock function when tapping minus button', () => {
    render(props)
    const button = screen.getByTestId('TouchscreenBrightness_decrease')
    fireEvent.click(button)
    expect(updateConfigValue).toHaveBeenCalled()
  })
})
