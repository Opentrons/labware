import { MemoryRouter } from 'react-router-dom'
import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { CalibrationTaskList } from '..'
import {
  mockDeckCalLauncher,
  mockTipLengthCalLauncher,
  mockPipOffsetCalLauncher,
  expectedBadDeckAndPipetteOffsetTaskList,
  expectedBadEverythingTaskList,
  expectedBadTipLengthAndOffsetTaskList,
  expectedTaskList,
  expectedIncompleteDeckCalTaskList,
  expectedIncompleteRightMountTaskList,
  expectedIncompleteLeftMountTaskList,
} from '../../Devices/hooks/__fixtures__/taskListFixtures'
import { useCalibrationTaskList } from '../../Devices/hooks'
import { useAttachedPipettes } from '/app/resources/instruments'
import { mockLeftProtoPipette } from '/app/redux/pipettes/__fixtures__'
import { useRunHasStarted } from '/app/resources/runs'

vi.mock('../../Devices/hooks')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/instruments')

const render = (robotName: string = 'otie') => {
  return renderWithProviders(
    <MemoryRouter>
      <CalibrationTaskList
        robotName={robotName}
        pipOffsetCalLauncher={mockPipOffsetCalLauncher}
        tipLengthCalLauncher={mockTipLengthCalLauncher}
        deckCalLauncher={mockDeckCalLauncher}
        exitBeforeDeckConfigCompletion={false}
      />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('CalibrationTaskList', () => {
  beforeEach(() => {
    vi.mocked(useCalibrationTaskList).mockReturnValue(expectedTaskList)
    vi.mocked(useRunHasStarted).mockReturnValue(false)
    vi.mocked(useAttachedPipettes).mockReturnValue({
      left: mockLeftProtoPipette,
      right: null,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the Calibration Task List', () => {
    render()
    screen.getByText('Deck Calibration')
    screen.getByText('Left Mount')
    screen.getByText('Right Mount')
  })

  it('does not show the Calibrations complete screen when viewing a completed task list', () => {
    render()
    expect(screen.queryByText('Calibrations complete!')).toBeFalsy()
  })

  it('shows the Calibrations complete screen after the calibrations are completed', () => {
    // initial render has incomplete calibrations, the rerender will use the completed calibrations mock response
    // this triggers the useEffect that causes the Calibrations complete screen to render
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedIncompleteDeckCalTaskList
    )
    const [{ rerender }] = render()
    expect(screen.getByText('Calibrate')).toBeTruthy()
    // Complete screen will only render if a wizard has been launched
    fireEvent.click(screen.getByText('Calibrate'))
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Calibrations complete!')).toBeTruthy()
  })

  it('renders the Calibration Task List properly when both tip length and offset are bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedBadTipLengthAndOffsetTaskList
    )
    const [{ rerender }] = render()
    screen.getByText('Deck Calibration')
    expect(screen.getByText('Recalibrate')).toBeTruthy()
    screen.getByText('Left Mount')
    expect(screen.getAllByText('Calibration recommended')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Calibrate' })).toBeTruthy()
    screen.getByText('Right Mount')
    fireEvent.click(screen.getByText('Calibrate'))
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Calibrations complete!')).toBeTruthy()
  })

  it('renders the Calibration Task List properly when both deck and offset are bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedBadDeckAndPipetteOffsetTaskList
    )
    const [{ rerender }] = render()
    screen.getByText('Deck Calibration')
    expect(screen.getAllByText('Calibration recommended')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Calibrate' })).toBeTruthy()
    screen.getByText('Left Mount')
    screen.getByText('Right Mount')
    fireEvent.click(screen.getByText('Calibrate'))
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Calibrations complete!')).toBeTruthy()
  })

  it('renders the Calibration Task List properly when everything is bad', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedBadEverythingTaskList
    )
    const [{ rerender }] = render()
    screen.getByText('Deck Calibration')
    expect(screen.getAllByText('Calibration recommended')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Calibrate' })).toBeTruthy()
    screen.getByText('Left Mount')
    screen.getByText('Right Mount')
    fireEvent.click(screen.getByText('Calibrate'))
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Calibrations complete!')).toBeTruthy()
  })

  it('launching a recalibrate wizard from a subtask will allow the calibration complete screen to show', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedIncompleteRightMountTaskList
    )

    const [{ rerender }] = render()
    fireEvent.click(screen.getByText('Left Mount'))
    const recalibrateLinks = screen.getAllByText('Recalibrate') // this includes the deck and Left Mount subtasks CTAs
    expect(recalibrateLinks).toHaveLength(3)
    fireEvent.click(recalibrateLinks[2])
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Calibrations complete!')).toBeTruthy()
  })

  it('launching a recalibrate wizard from a task will allow the calibration complete screen to show', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedIncompleteRightMountTaskList
    )

    const [{ rerender }] = render()
    fireEvent.click(screen.getByText('Left Mount'))
    const recalibrateLinks = screen.getAllByText('Recalibrate')
    expect(recalibrateLinks).toHaveLength(3)
    fireEvent.click(recalibrateLinks[0])
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Calibrations complete!')).toBeTruthy()
  })

  it('exiting a recalibrate wizard from a task will allow the current calibrations screen to show', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedIncompleteRightMountTaskList
    )

    const [{ rerender }] = render()
    const recalibrateLink = screen.getByText('Recalibrate')
    fireEvent.click(recalibrateLink)
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={true}
        />
      </MemoryRouter>
    )
    expect(screen.getByText('Using current calibrations.')).toBeTruthy()
  })

  it('prevents the user from launching calibrations or recalibrations from a task when a protocol run is active', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedIncompleteDeckCalTaskList
    )
    vi.mocked(useRunHasStarted).mockReturnValue(true)

    const [{ rerender }] = render()
    const calibrateButtons = screen.getAllByText('Calibrate')
    expect(calibrateButtons).toHaveLength(1) // only deck's calibration button should be shown
    fireEvent.click(calibrateButtons[0])
    expect(mockDeckCalLauncher).not.toHaveBeenCalled()
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    const recalibrateLinks = screen.getAllByText('Recalibrate')
    expect(recalibrateLinks).toHaveLength(1) // only deck's recalibration link should be shown
    fireEvent.click(recalibrateLinks[0])
    expect(mockDeckCalLauncher).not.toHaveBeenCalled()
  })

  it('prevents the user from launching calibrations or recalibrations from a subtask when a protocol run is active', () => {
    vi.mocked(useCalibrationTaskList).mockReturnValueOnce(
      expectedIncompleteLeftMountTaskList
    )
    vi.mocked(useRunHasStarted).mockReturnValue(true)

    const [{ rerender }] = render()
    const calibrateButtons = screen.getAllByText('Calibrate')
    expect(calibrateButtons).toHaveLength(1) // only the left mounts tip length button should show
    fireEvent.click(calibrateButtons[0])
    expect(mockTipLengthCalLauncher).not.toHaveBeenCalled()
    rerender(
      <MemoryRouter>
        <CalibrationTaskList
          robotName="otie"
          pipOffsetCalLauncher={mockPipOffsetCalLauncher}
          tipLengthCalLauncher={mockTipLengthCalLauncher}
          deckCalLauncher={mockDeckCalLauncher}
          exitBeforeDeckConfigCompletion={false}
        />
      </MemoryRouter>
    )
    fireEvent.click(screen.getByText('Left Mount'))
    const recalibrateLinks = screen.getAllByText('Recalibrate')
    expect(recalibrateLinks).toHaveLength(3) // deck and left mounts links are showing
    fireEvent.click(recalibrateLinks[1])
    expect(mockTipLengthCalLauncher).not.toHaveBeenCalled()
  })
})
