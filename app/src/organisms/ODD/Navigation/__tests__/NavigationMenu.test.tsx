import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { home } from '/app/redux/robot-controls'
import { useLights } from '/app/resources/devices'
import { RestartRobotConfirmationModal } from '../RestartRobotConfirmationModal'
import { NavigationMenu } from '../NavigationMenu'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

vi.mock('/app/redux/robot-admin')
vi.mock('/app/redux/robot-controls')
vi.mock('/app/resources/devices')
vi.mock('../RestartRobotConfirmationModal')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockToggleLights = vi.fn()

const render = (props: ComponentProps<typeof NavigationMenu>) => {
  return renderWithProviders(<NavigationMenu {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('NavigationMenu', () => {
  let props: ComponentProps<typeof NavigationMenu>
  beforeEach(() => {
    props = {
      onClick: vi.fn(),
      robotName: 'otie',
      setShowNavMenu: vi.fn(),
    }
    vi.mocked(useLights).mockReturnValue({
      lightsOn: false,
      toggleLights: mockToggleLights,
    })
    vi.mocked(RestartRobotConfirmationModal).mockReturnValue(
      <div>mock RestartRobotConfirmationModal</div>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should render the home menu item and clicking home gantry, dispatches home and call a mock function', () => {
    render(props)
    fireEvent.click(screen.getByLabelText('BackgroundOverlay_ModalShell'))
    expect(props.onClick).toHaveBeenCalled()
    screen.getByLabelText('reset-position_icon')
    fireEvent.click(screen.getByText('Home gantry'))
    expect(vi.mocked(home)).toHaveBeenCalled()
    expect(props.setShowNavMenu).toHaveBeenCalled()
  })

  it('should render the restart robot menu item and clicking it, dispatches restart robot', () => {
    render(props)
    const restart = screen.getByText('Restart robot')
    screen.getByLabelText('restart_icon')
    fireEvent.click(restart)
    screen.getByText('mock RestartRobotConfirmationModal')
  })

  it('should render the lights menu item with lights off and clicking it, calls useLights', () => {
    render(props)
    const lights = screen.getByText('Lights on')
    screen.getByLabelText('light_icon')
    fireEvent.click(lights)
    expect(mockToggleLights).toHaveBeenCalled()
  })

  it('should render the lights menu item with lights on', () => {
    vi.mocked(useLights).mockReturnValue({
      lightsOn: true,
      toggleLights: mockToggleLights,
    })
    render(props)
    screen.getByText('Lights off')
  })

  it('should render the deck configuration menu item', () => {
    render(props)
    screen.getByText('Deck configuration')
    screen.getByLabelText('deck-map_icon')
  })

  it('should call a mock function when tapping deck configuration', () => {
    render(props)
    fireEvent.click(screen.getByText('Deck configuration'))
    expect(mockNavigate).toHaveBeenCalledWith('/deck-configuration')
  })
})
