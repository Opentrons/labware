import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'

import { i18n } from '/app/i18n'
import { useLEDLights } from '/app/resources/robot-settings'
import { EnableStatusLight } from '../EnableStatusLight'

import type { ComponentProps } from 'react'

vi.mock('/app/resources/robot-settings')

const ROBOT_NAME = 'otie'
const mockToggleLights = vi.fn()
const render = (props: ComponentProps<typeof EnableStatusLight>) => {
  return renderWithProviders(<EnableStatusLight {...props} />, {
    i18nInstance: i18n,
  })
}

describe('EnableStatusLight', () => {
  let props: ComponentProps<typeof EnableStatusLight>

  beforeEach(() => {
    props = {
      robotName: ROBOT_NAME,
      isEstopNotDisengaged: false,
    }
    vi.mocked(useLEDLights).mockReturnValue({
      lightsEnabled: false,
      toggleLights: mockToggleLights,
    })
  })

  it('should render text and toggle button', () => {
    render(props)
    screen.getByText('Enable status light')
    screen.getByText(
      'Turn on or off the strip of color LEDs on the front of the robot.'
    )
    expect(screen.getByLabelText('enable_status_light')).toBeInTheDocument()
  })

  it('should call a mock function when clicking toggle button', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('enable_status_light'))
    expect(mockToggleLights).toHaveBeenCalled()
  })

  it('shoud make toggle button disabled when e-stop is pressed', () => {
    props = {
      ...props,
      isEstopNotDisengaged: true,
    }
    render(props)
    expect(screen.getByLabelText('enable_status_light')).toBeDisabled()
  })
})
