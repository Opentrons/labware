import * as React from 'react'
import { saveAs } from 'file-saver'
import { MemoryRouter } from 'react-router-dom'

import { renderWithProviders } from '@opentrons/components'

import { i18n } from '../../../../i18n'
import { DeckCalibrationModal } from '../../../../organisms/ProtocolSetup/RunSetupCard/RobotCalibration/DeckCalibrationModal'
import { useTrackEvent } from '../../../../redux/analytics'
import { mockDeckCalData } from '../../../../redux/calibration/__fixtures__'
import {
  mockPipetteOffsetCalibration1,
  mockPipetteOffsetCalibration2,
  mockPipetteOffsetCalibration3,
} from '../../../../redux/calibration/pipette-offset/__fixtures__'
import {
  mockTipLengthCalibration1,
  mockTipLengthCalibration2,
  mockTipLengthCalibration3,
} from '../../../../redux/calibration/tip-length/__fixtures__'
import { mockConnectableRobot } from '../../../../redux/discovery/__fixtures__'
import {
  useDeckCalibrationData,
  usePipetteOffsetCalibrations,
  useRobot,
  useTipLengthCalibrations,
} from '../../hooks'
import { useCurrentRunId } from '../../../../organisms/ProtocolUpload/hooks'
import { RobotSettingsCalibration } from '../RobotSettingsCalibration'

jest.mock('file-saver')

jest.mock(
  '../../../../organisms/ProtocolSetup/RunSetupCard/RobotCalibration/DeckCalibrationModal'
)
jest.mock('../../../../redux/analytics')
jest.mock('../../../../redux/config')
jest.mock('../../../../redux/robot')
jest.mock('../../hooks')
jest.mock('../../../../organisms/ProtocolUpload/hooks')
jest.mock('@opentrons/components', () => {
  const actualComponents = jest.requireActual('@opentrons/components')
  return {
    ...actualComponents,
    Tooltip: jest.fn(({ children }) => <div>{children}</div>),
  }
})

const mockDeckCalibrationModal = DeckCalibrationModal as jest.MockedFunction<
  typeof DeckCalibrationModal
>
const mockUseDeckCalibrationData = useDeckCalibrationData as jest.MockedFunction<
  typeof useDeckCalibrationData
>
const mockUsePipetteOffsetCalibrations = usePipetteOffsetCalibrations as jest.MockedFunction<
  typeof usePipetteOffsetCalibrations
>
const mockUseRobot = useRobot as jest.MockedFunction<typeof useRobot>
const mockUseTipLengthCalibrations = useTipLengthCalibrations as jest.MockedFunction<
  typeof useTipLengthCalibrations
>
const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>
const mockUseCurrentRunId = useCurrentRunId as jest.MockedFunction<
  typeof useCurrentRunId
>

let mockTrackEvent: jest.Mock

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <RobotSettingsCalibration robotName="otie" />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('RobotSettingsCalibration', () => {
  const realBlob = global.Blob
  beforeAll(() => {
    // @ts-expect-error(sa, 2021-6-28): not a valid blob interface
    global.Blob = function (content: any, options: any) {
      return { content, options }
    }
  })

  afterAll(() => {
    global.Blob = realBlob
  })

  beforeEach(() => {
    mockTrackEvent = jest.fn()
    mockUseTrackEvent.mockReturnValue(mockTrackEvent)
    mockDeckCalibrationModal.mockReturnValue(
      <div>Mock DeckCalibrationModal</div>
    )
    mockUseDeckCalibrationData.mockReturnValue({
      deckCalibrationData: mockDeckCalData,
      isDeckCalibrated: true,
    })
    mockUsePipetteOffsetCalibrations.mockReturnValue([
      mockPipetteOffsetCalibration1,
      mockPipetteOffsetCalibration2,
      mockPipetteOffsetCalibration3,
    ])
    mockUseRobot.mockReturnValue(mockConnectableRobot)
    mockUseTipLengthCalibrations.mockReturnValue([
      mockTipLengthCalibration1,
      mockTipLengthCalibration2,
      mockTipLengthCalibration3,
    ])
    mockUseCurrentRunId.mockReturnValue(null)
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders a title and description', () => {
    const [{ getByText }] = render()
    getByText('About Calibration')
    getByText(
      'For the robot to move accurately and precisely, you need to calibrate it. Positional calibration happens in three parts: deck calibration, pipette offset calibration and tip length calibration.'
    )
  })

  it('renders a clickable link to the deck calibration modal', () => {
    const [{ getByText, queryByText }] = render()
    expect(queryByText('Mock DeckCalibrationModal')).toBeFalsy()
    const modalLink = getByText('See how robot calibration works')
    modalLink.click()
    getByText('Mock DeckCalibrationModal')
  })

  it('renders a download calibration data button', () => {
    const [{ getByText }] = render()

    const downloadButton = getByText('Download calibration data')
    downloadButton.click()
    expect(saveAs).toHaveBeenCalled()
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'calibrationDataDownloaded',
      properties: {},
    })
  })

  it('renders a title and description - Calibration Health Check section', () => {
    const [{ getByText }] = render()
    getByText('Calibration Health Check')
    getByText(
      'Check the accuracy of key calibration points without recalibrating the robot.'
    )
  })

  it('renders a Check health button', () => {
    const [{ getByRole }] = render()
    getByRole('button', { name: 'Check health' })
  })

  it('Health check button is clickable', () => {
    const [{ getByRole }] = render()
    const healthCheckButton = getByRole('button', { name: 'Check health' })
    // fireEvent.click(healthCheckButton)
    expect(healthCheckButton).not.toBeDisabled()
  })

  // TODO 5/9/2022 kj temporary commenting out
  // it('Health check button is not clickable and display tooltip', () => {
  //   mockUseCurrentRunId.mockReturnValue('RUNID')
  //   const [{ getByRole }] = render()
  //   const healthCheckButton = getByRole('button', { name: 'Check health' })
  //   expect(healthCheckButton).toBeInTheDocument()
  //   fireEvent.mouseOver(healthCheckButton)
  //   getByRole('tooltip', {
  //     name: 'Fully calibrate your robot before checking calibration health',
  //   })
  // })
})
