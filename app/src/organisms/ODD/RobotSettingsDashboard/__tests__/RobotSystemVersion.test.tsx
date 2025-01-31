import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { RobotSystemVersion } from '../RobotSystemVersion'
import { RobotSystemVersionModal } from '../RobotSystemVersionModal'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/shell')
vi.mock('../RobotSystemVersionModal')

const mockBack = vi.fn()

const render = (props: ComponentProps<typeof RobotSystemVersion>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotSystemVersion {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('RobotSystemVersion', () => {
  let props: ComponentProps<typeof RobotSystemVersion>

  beforeEach(() => {
    props = {
      currentVersion: 'mock7.0.0',
      isUpdateAvailable: false,
      setCurrentOption: mockBack,
      robotUpdateInfo: null,
    }
    vi.mocked(RobotSystemVersionModal).mockReturnValue(
      <div>mock RobotSystemVersionModal</div>
    )
  })

  it('should render text when there is no available update', () => {
    render(props)
    screen.getByText('Robot System Version')
    screen.getByText(
      'View latest release notes at https://github.com/Opentrons/opentrons/releases'
    )
    screen.getByText('Current Version')
    screen.getByText('mock7.0.0')
  })

  it('should render text when there is available update', () => {
    props = {
      ...props,
      isUpdateAvailable: true,
      robotUpdateInfo: {
        target: 'flex',
        version: 'mock1.2.3',
        releaseNotes: null,
      },
    }
    render(props)
    screen.getByText('Update available')
    screen.getByText('View update')
  })

  it('should render mock robot system version modal when tapping view update', () => {
    props = {
      ...props,
      isUpdateAvailable: true,
    }
    render(props)
    fireEvent.click(screen.getByText('View update'))
    screen.getByText('mock RobotSystemVersionModal')
  })

  it('should call a mock function when tapping Back button', () => {
    render(props)
    fireEvent.click(screen.getByRole('button'))
    expect(mockBack).toHaveBeenCalled()
  })
})
