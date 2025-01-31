import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useCurrentRunId } from '/app/resources/runs'
import { ChooseProtocolSlideout } from '/app/organisms/Desktop/ChooseProtocolSlideout'
import { RobotOverflowMenu } from '../RobotOverflowMenu'
import { useIsRobotOnWrongVersionOfSoftware } from '/app/redux/robot-update'
import { useIsRobotBusy } from '/app/redux-resources/robots'

import {
  mockUnreachableRobot,
  mockConnectedRobot,
} from '/app/redux/discovery/__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/robot-update/hooks')
vi.mock('/app/resources/runs')
vi.mock('/app/organisms/Desktop/ChooseProtocolSlideout')
vi.mock('../hooks')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/devices/hooks/useIsEstopNotDisengaged')

const render = (props: ComponentProps<typeof RobotOverflowMenu>) => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotOverflowMenu {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('RobotOverflowMenu', () => {
  let props: ComponentProps<typeof RobotOverflowMenu>

  beforeEach(() => {
    props = {
      robot: mockConnectedRobot,
    }
    vi.mocked(useCurrentRunId).mockReturnValue('RUNID')
    vi.mocked(ChooseProtocolSlideout).mockReturnValue(
      <div>choose protocol slideout</div>
    )
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(false)
    vi.mocked(useIsRobotBusy).mockReturnValue(false)
  })

  it('renders overflow menu items when the robot is reachable and a run id is present', () => {
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    screen.getByRole('link', { name: 'Robot settings' })
  })

  it('renders overflow menu items when the robot is not reachable', () => {
    vi.mocked(useCurrentRunId).mockReturnValue(null)

    props = {
      robot: mockUnreachableRobot,
    }
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    screen.getByText('Why is this robot unavailable?')
    screen.getByText('Forget unavailable robot')
  })

  it('disables the run a protocol menu item if robot software update is available', () => {
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(true)
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    const run = screen.getByText('Run a protocol')
    expect(run).toBeDisabled()
  })

  it('disables the run a protocol menu item if robot is busy', () => {
    vi.mocked(useCurrentRunId).mockReturnValue(null)
    vi.mocked(useIsRobotBusy).mockReturnValue(true)
    render(props)
    const btn = screen.getByLabelText('RobotOverflowMenu_button')
    fireEvent.click(btn)
    const run = screen.getByText('Run a protocol')
    expect(run).toBeDisabled()
  })
})
