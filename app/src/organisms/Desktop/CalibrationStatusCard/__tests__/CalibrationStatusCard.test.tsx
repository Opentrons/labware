import { MemoryRouter } from 'react-router-dom'
import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { CalibrationStatusCard } from '..'
import { useCalibrationTaskList } from '../../Devices/hooks'
import {
  expectedBadDeckTaskList,
  expectedBadDeckAndPipetteOffsetTaskList,
  expectedBadEverythingTaskList,
  expectedBadPipetteOffsetTaskList,
  expectedBadTipLengthTaskList,
  expectedBadTipLengthAndOffsetTaskList,
  expectedIncompleteDeckCalTaskList,
  expectedTaskList,
} from '../../Devices/hooks/__fixtures__/taskListFixtures'

import type { ComponentProps } from 'react'

vi.mock('../../Devices/hooks')

const render = (props: ComponentProps<typeof CalibrationStatusCard>) => {
  return renderWithProviders(
    <MemoryRouter>
      <CalibrationStatusCard {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockSetShowHowCalibrationWorksModal = vi.fn()

describe('CalibrationStatusCard', () => {
  beforeEach(() => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(expectedTaskList)
  })

  const props: ComponentProps<typeof CalibrationStatusCard> = {
    robotName: 'otie',
    setShowHowCalibrationWorksModal: mockSetShowHowCalibrationWorksModal,
  }

  it('renders a calibration status title and description', () => {
    render(props)
    screen.getByText('Calibration Status')
    screen.getByText(
      `For accurate and precise movement, calibrate the robot's deck, pipette offsets, and tip lengths.`
    )
  })

  it('renders a complete status label', () => {
    render(props)
    screen.getByText('Calibration complete')
  })

  it('renders a missing status label', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedIncompleteDeckCalTaskList
    )
    render(props)
    screen.getByText('Missing calibration data')
  })

  it('renders a recommended status label when the deck is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(expectedBadDeckTaskList)
    render(props)
    screen.getByText('Calibration recommended')
  })

  it('renders a recommended status label when both the deck and offset is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadDeckAndPipetteOffsetTaskList
    )
    render(props)
    screen.getByText('Calibration recommended')
  })

  it('renders a recommended status label when everything is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadEverythingTaskList
    )
    render(props)
    screen.getByText('Calibration recommended')
  })

  it('renders a recommended status label when the offset is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadPipetteOffsetTaskList
    )
    render(props)
    screen.getByText('Calibration recommended')
  })

  it('renders a recommended status label when the tip length is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadTipLengthTaskList
    )
    render(props)
    screen.getByText('Calibration recommended')
  })

  it('renders a recommended status label when both the tip length and offset is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(
      expectedBadTipLengthAndOffsetTaskList
    )
    render(props)
    screen.getByText('Calibration recommended')
  })

  it('renders a "See how robot calibration works button"', () => {
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'See how robot calibration works' })
    )
    expect(mockSetShowHowCalibrationWorksModal).toBeCalled()
  })

  it('renders a link to launch the calibration dashboard', () => {
    render(props)
    const calibrationDashboardLink = screen.getByRole('link', {
      name: 'Launch calibration',
    })
    expect(calibrationDashboardLink.getAttribute('href')).toEqual(
      '/devices/otie/robot-settings/calibration/dashboard'
    )
  })
})
