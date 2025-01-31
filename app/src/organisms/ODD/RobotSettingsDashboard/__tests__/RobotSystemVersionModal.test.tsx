import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { RobotSystemVersionModal } from '../RobotSystemVersionModal'

import type { ComponentProps } from 'react'
import type * as Dom from 'react-router-dom'

const mockFn = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<typeof Dom>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof RobotSystemVersionModal>) => {
  return renderWithProviders(<RobotSystemVersionModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('RobotSystemVersionModal', () => {
  let props: ComponentProps<typeof RobotSystemVersionModal>

  beforeEach(() => {
    props = {
      version: 'mockVersion',
      releaseNotes: 'mockReleaseNote',
      setShowModal: mockFn,
    }
  })

  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Robot System Version mockVersion available')
    screen.getByText(
      'Updating the robot software requires restarting the robot'
    )
    screen.getByText('mockReleaseNote')
    screen.getByText('Not now')
    screen.getByText('Update')
  })

  it('should close the modal when tapping remind me later', () => {
    render(props)
    fireEvent.click(screen.getByText('Update'))
    expect(mockNavigate).toHaveBeenCalledWith('/robot-settings/update-robot')
  })

  it('should call the mock function when tapping update', () => {
    render(props)
    fireEvent.click(screen.getByText('Not now'))
    expect(mockFn).toHaveBeenCalled()
  })
})
