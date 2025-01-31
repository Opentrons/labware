import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import * as Buildroot from '/app/redux/robot-update'
import {
  mockConnectableRobot,
  mockReachableRobot,
} from '/app/redux/discovery/__fixtures__'
import { handleUpdateBuildroot } from '../../Devices/RobotSettings/UpdateBuildroot'
import { UpdateRobotBanner } from '..'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/robot-update')
vi.mock('../../Devices/RobotSettings/UpdateBuildroot')

const getUpdateDisplayInfo = Buildroot.getRobotUpdateDisplayInfo

const render = (props: ComponentProps<typeof UpdateRobotBanner>) => {
  return renderWithProviders(<UpdateRobotBanner {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UpdateRobotBanner', () => {
  let props: ComponentProps<typeof UpdateRobotBanner>

  beforeEach(() => {
    props = {
      robot: mockConnectableRobot,
    }
    vi.mocked(getUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'upgrade',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
  })

  it('should display correct information', () => {
    render(props)
    screen.getByText(
      'A robot software update is required to run protocols with this version of the Opentrons App.'
    )
    const btn = screen.getByRole('button', { name: 'View update' })
    fireEvent.click(btn)
    expect(handleUpdateBuildroot).toHaveBeenCalled()
  })

  it('should render nothing if update is not available when autoUpdateAction returns reinstall', () => {
    vi.mocked(getUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'reinstall',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    const bannerText = screen.queryByText(
      'A robot software update is required to run protocols with this version of the Opentrons App.'
    )
    expect(bannerText).toBeNull()
  })

  it('should render nothing if update is not available when autoUpdateAction returns downgrade', () => {
    vi.mocked(getUpdateDisplayInfo).mockReturnValue({
      autoUpdateAction: 'downgrade',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    render(props)
    screen.getByText(
      'A robot software update is required to run protocols with this version of the Opentrons App.'
    )
  })

  it('should render nothing if robot health status is not ok', () => {
    props = {
      robot: mockReachableRobot,
    }
    const bannerText = screen.queryByText(
      'A robot software update is required to run protocols with this version of the Opentrons App.'
    )
    expect(bannerText).toBeNull()
  })
})
