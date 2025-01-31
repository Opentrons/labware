import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach } from 'vitest'

import { i18n } from '/app/i18n'
import * as RobotApi from '/app/redux/robot-api'
import {
  mockDeckCalData,
  mockWarningDeckCalData,
} from '/app/redux/calibration/__fixtures__'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import { mockAttachedPipette } from '/app/redux/pipettes/__fixtures__'
import { useDeckCalibrationData } from '/app/organisms/Desktop/Devices/hooks'
import { useAttachedPipettes } from '/app/resources/instruments'
import { useRobot } from '/app/redux-resources/robots'
import { renderWithProviders } from '/app/__testing-utils__'

import { RobotSettingsDeckCalibration } from '../RobotSettingsDeckCalibration'

import type { ComponentProps } from 'react'
import type { AttachedPipettesByMount } from '/app/redux/pipettes/types'

vi.mock('../..//CalibrationStatusCard')
vi.mock('/app/redux/robot-api/selectors')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/organisms/Desktop/Devices/hooks')
vi.mock('/app/resources/instruments')

const mockAttachedPipettes: AttachedPipettesByMount = {
  left: mockAttachedPipette,
  right: mockAttachedPipette,
} as any

const render = (
  props?: Partial<ComponentProps<typeof RobotSettingsDeckCalibration>>
) => {
  return renderWithProviders(
    <RobotSettingsDeckCalibration robotName="otie" {...props} />,
    {
      i18nInstance: i18n,
    }
  )
}
const getRequestById = RobotApi.getRequestById

describe('RobotSettingsDeckCalibration', () => {
  beforeEach(() => {
    vi.mocked(useDeckCalibrationData).mockReturnValue({
      deckCalibrationData: mockDeckCalData,
      isDeckCalibrated: true,
    })
    vi.mocked(useRobot).mockReturnValue(mockConnectableRobot)
    vi.mocked(useAttachedPipettes).mockReturnValue(mockAttachedPipettes)
    vi.mocked(getRequestById).mockReturnValue(null)
  })

  it('renders a title description and button', () => {
    render()
    screen.getByText('Deck Calibration')
    screen.getByText(
      'Calibrating the deck is required for new robots or after you relocate your robot. Recalibrating the deck will require you to also recalibrate pipette offsets.'
    )
    screen.getByText('Last calibrated: September 15, 2021 00:00')
  })

  it('renders empty state if yet not calibrated', () => {
    vi.mocked(useDeckCalibrationData).mockReturnValue({
      deckCalibrationData: null,
      isDeckCalibrated: false,
    })
    render()
    screen.getByText('Not calibrated yet')
  })

  it('renders the last calibrated when deck calibration is not good', () => {
    vi.mocked(useDeckCalibrationData).mockReturnValue({
      deckCalibrationData: mockWarningDeckCalData,
      isDeckCalibrated: true,
    })
    render()
    screen.getByText('Last calibrated: September 22, 2222 00:00')
  })
})
