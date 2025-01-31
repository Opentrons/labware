import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import {
  getDevtoolsEnabled,
  getUpdateChannelOptions,
  updateConfigValue,
} from '/app/redux/config'
import { renderWithProviders } from '/app/__testing-utils__'

import { UpdateChannel } from '../UpdateChannel'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')

const mockChannelOptions = [
  {
    label: 'Stable',
    value: 'latest',
  },
  { label: 'Beta', value: 'beta' },
  { label: 'Alpha', value: 'alpha' },
]

const mockhandleBackPress = vi.fn()

const render = (props: ComponentProps<typeof UpdateChannel>) => {
  return renderWithProviders(<UpdateChannel {...props} />, {
    i18nInstance: i18n,
  })
}

describe('UpdateChannel', () => {
  let props: ComponentProps<typeof UpdateChannel>
  beforeEach(() => {
    props = {
      handleBackPress: mockhandleBackPress,
    }
    vi.mocked(getUpdateChannelOptions).mockReturnValue(mockChannelOptions)
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Update Channel')
    screen.getByText(
      'Stable receives the latest stable releases. Beta allows you to try out new in-progress features before they launch in Stable channel, but they have not completed testing yet.'
    )
    screen.getByText('Stable')
    screen.getByText('Beta')
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(
      screen.queryByText(
        'Warning: alpha releases are feature-complete but may contain significant bugs.'
      )
    ).not.toBeInTheDocument()
  })

  it('should render alpha when dev tools on', () => {
    vi.mocked(getDevtoolsEnabled).mockReturnValue(true)
    render(props)
    screen.getByText('Alpha')
    screen.getByText(
      'Warning: alpha releases are feature-complete but may contain significant bugs.'
    )
  })

  it('should call mock function when tapping a channel button', () => {
    render(props)
    const button = screen.getByText('Stable')
    fireEvent.click(button)
    expect(updateConfigValue).toHaveBeenCalled()
  })

  it('should call mock function when tapping back button', () => {
    render(props)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(props.handleBackPress).toHaveBeenCalled()
  })
})
