import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEvent, ANALYTICS_RENAME_ROBOT } from '/app/redux/analytics'
import {
  getConnectableRobots,
  getReachableRobots,
  getUnreachableRobots,
} from '/app/redux/discovery'
import {
  mockConnectableRobot,
  mockReachableRobot,
} from '/app/redux/discovery/__fixtures__'
import { RenameRobotSlideout } from '../RenameRobotSlideout'
import { useIsFlex } from '/app/redux-resources/robots'

vi.mock('/app/redux/discovery/selectors')
vi.mock('/app/redux/analytics')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/redux/discovery', async importOriginal => {
  const actual = await importOriginal<typeof getUnreachableRobots>()
  return {
    ...actual,
    getUnreachableRobots: vi.fn(),
  }
})

const mockOnCloseClick = vi.fn()
let mockTrackEvent: any

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <RenameRobotSlideout
        isExpanded={true}
        onCloseClick={mockOnCloseClick}
        robotName="otie"
      />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('RobotSettings RenameRobotSlideout', () => {
  beforeEach(() => {
    mockTrackEvent = vi.fn()
    vi.mocked(useTrackEvent).mockReturnValue(mockTrackEvent)
    mockConnectableRobot.name = 'connectableOtie'
    mockReachableRobot.name = 'reachableOtie'
    vi.mocked(getConnectableRobots).mockReturnValue([mockConnectableRobot])
    vi.mocked(getReachableRobots).mockReturnValue([mockReachableRobot])
    vi.mocked(useIsFlex).mockReturnValue(false)
    vi.mocked(getUnreachableRobots).mockReturnValue([])
  })

  it('should render title, description, label, input, and button', () => {
    render()

    screen.getByText('Rename Robot')
    screen.getByText(
      'To ensure reliable renaming of your robot, please connect to it via USB.'
    )
    screen.getByText(
      'Please enter 17 characters max using valid inputs: letters and numbers.'
    )
    screen.getByText('Robot Name')
    screen.getByText('17 characters max')
    screen.getByRole('textbox')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    expect(renameButton).toBeInTheDocument()
    expect(renameButton).toBeDisabled()
  })

  it('should render title, description, label, input, and button for flex', () => {
    vi.mocked(useIsFlex).mockReturnValue(true)
    render()
    screen.getByText('Rename Robot')
    expect(
      screen.queryByText(
        'To ensure reliable renaming of your robot, please connect to it via USB.'
      )
    ).not.toBeInTheDocument()
    screen.getByText(
      'Please enter 17 characters max using valid inputs: letters and numbers.'
    )
    screen.getByText('Robot Name')
    screen.getByText('17 characters max')
    screen.getByRole('textbox')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    expect(renameButton).toBeInTheDocument()
    expect(renameButton).toBeDisabled()
  })

  it('should be disabled false when a user typing allowed characters', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'mockInput' } })

    await waitFor(() => {
      expect(input).toHaveValue('mockInput')
    })
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    await waitFor(() => {
      expect(renameButton).not.toBeDisabled()
    })
    fireEvent.click(renameButton)
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith({
        name: ANALYTICS_RENAME_ROBOT,
        properties: {
          newRobotName: 'mockInput',
          previousRobotName: 'otie',
          robotType: OT2_ROBOT_TYPE,
        },
      })
    })
  })

  it('button should be disabled and render the error message when a user types invalid character/characters', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'mockInput@@@' } })
    expect(input).toHaveValue('mockInput@@@')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    const error = await screen.findByText(
      'Oops! Robot name must follow the character count and limitations.'
    )
    await waitFor(() => {
      expect(renameButton).toBeDisabled()
    })
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('button should be disabled and render the error message when a user types more than 17 characters', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, {
      target: { value: 'aaaaaaaaaaaaaaaaaa' },
    })
    expect(input).toHaveValue('aaaaaaaaaaaaaaaaaa')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    const error = await screen.findByText(
      'Oops! Robot name must follow the character count and limitations.'
    )
    await waitFor(() => {
      expect(renameButton).toBeDisabled()
    })
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('button should be disabled and render the error message when a user tries to use space', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, {
      target: { value: 'Hello world123' },
    })
    expect(input).toHaveValue('Hello world123')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    const error = await screen.findByText(
      'Oops! Robot name must follow the character count and limitations.'
    )
    await waitFor(() => {
      expect(renameButton).toBeDisabled()
    })
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('button should be disabled and render the error message when a user tries to use space as the first letter', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, {
      target: { value: ' ' },
    })
    expect(input).toHaveValue(' ')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    const error = await screen.findByText(
      'Oops! Robot name must follow the character count and limitations.'
    )
    await waitFor(() => {
      expect(renameButton).toBeDisabled()
    })
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('button should be disabled and render the error message when a user rename a robot to a name that used by a connectable robot', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, {
      target: { value: 'connectableOtie' },
    })
    expect(input).toHaveValue('connectableOtie')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    const error = await screen.findByText(
      'Oops! Name is already in use. Choose a different name.'
    )
    await waitFor(() => {
      expect(renameButton).toBeDisabled()
    })
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })
  it('button should be disabled and render the error message when a user rename a robot to a name that used by a reachable robot', async () => {
    render()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, {
      target: { value: 'reachableOtie' },
    })
    expect(input).toHaveValue('reachableOtie')
    const renameButton = screen.getByRole('button', { name: 'Rename robot' })
    const error = await screen.findByText(
      'Oops! Name is already in use. Choose a different name.'
    )
    await waitFor(() => {
      expect(renameButton).toBeDisabled()
    })
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })
  // TODO: kj   The following test case will be tested in the future
  // it('should close the slideout when a user change the name successfully', () => {
  //   const [{ getByRole }, store] = render()
  //   expect(store.dispatch).toHaveBeenCalledWith(removeRobot('otie'))
  //   const input = getByRole('textbox')
  //   fireEvent.change(input, { target: { value: 'newMockInput' } })
  //   const renameButton = getByRole('button', { name: 'Rename robot' })
  //   fireEvent.click(renameButton)
  //   expect(store.getState().router.location.pathname).toBe(
  //     '/devices/newMockInput/robot-settings'
  //   )
  // })
})
