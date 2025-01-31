import { fireEvent, screen } from '@testing-library/react'
import { vi, describe, beforeEach, afterEach, expect, it } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { toggleAnalyticsOptedIn } from '/app/redux/analytics'
import { getRobotSettings } from '/app/redux/robot-settings'

import { Privacy } from '../Privacy'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/analytics')
vi.mock('/app/redux/robot-settings')

const render = (props: ComponentProps<typeof Privacy>) => {
  return renderWithProviders(<Privacy {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Privacy', () => {
  let props: ComponentProps<typeof Privacy>
  beforeEach(() => {
    props = {
      robotName: 'Otie',
      setCurrentOption: vi.fn(),
    }
    vi.mocked(getRobotSettings).mockReturnValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Privacy')
    screen.getByText(
      'Opentrons cares about your privacy. We anonymize all data and only use it to improve our products.'
    )
    screen.getByText('Share display usage')
    screen.getByText('Data on how you interact with the touchscreen on Flex.')
  })

  it('should toggle display usage sharing on click', () => {
    render(props)
    fireEvent.click(screen.getByText('Share display usage'))
    expect(vi.mocked(toggleAnalyticsOptedIn)).toBeCalled()
  })
})
