import { when } from 'vitest-when'
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterAll,
} from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  useInstrumentsQuery,
  useModulesQuery,
} from '@opentrons/react-api-client'
import { instrumentsResponseFixture } from '@opentrons/api-client'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { i18n } from '/app/i18n'
import {
  useTrackEvent,
  ANALYTICS_CALIBRATION_DATA_DOWNLOADED,
} from '/app/redux/analytics'
import { mockDeckCalData } from '/app/redux/calibration/__fixtures__'
import {
  mockPipetteOffsetCalibration1,
  mockPipetteOffsetCalibration2,
  mockPipetteOffsetCalibration3,
} from '/app/redux/calibration/pipette-offset/__fixtures__'
import {
  mockTipLengthCalibration1,
  mockTipLengthCalibration2,
  mockTipLengthCalibration3,
} from '/app/redux/calibration/tip-length/__fixtures__'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import {
  useDeckCalibrationData,
  usePipetteOffsetCalibrations,
  useTipLengthCalibrations,
} from '/app/organisms/Desktop/Devices/hooks'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { renderWithProviders } from '/app/__testing-utils__'
import { useIsEstopNotDisengaged } from '/app/resources/devices/hooks/useIsEstopNotDisengaged'
import { CalibrationDataDownload } from '../CalibrationDataDownload'

// file-saver has circular dep, need to mock with factory to prevent error
vi.mock('file-saver', async importOriginal => {
  const actual = await importOriginal<typeof saveAs>()
  return {
    ...actual,
    saveAs: vi.fn(),
  }
})
vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/analytics')
vi.mock('/app/organisms/Desktop/Devices/hooks')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/devices/hooks/useIsEstopNotDisengaged')

let mockTrackEvent: any
const mockSetShowHowCalibrationWorksModal = vi.fn()
const ROBOT_NAME = 'otie'

const render = () => {
  return renderWithProviders(
    <CalibrationDataDownload
      robotName={ROBOT_NAME}
      setShowHowCalibrationWorksModal={mockSetShowHowCalibrationWorksModal}
    />,
    {
      i18nInstance: i18n,
    }
  )
}

describe('CalibrationDataDownload', () => {
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
    mockTrackEvent = vi.fn()
    when(useTrackEvent).calledWith().thenReturn(mockTrackEvent)
    when(useDeckCalibrationData)
      .calledWith(mockConnectableRobot.name)
      .thenReturn({
        deckCalibrationData: mockDeckCalData,
        isDeckCalibrated: true,
      })
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(false)
    when(usePipetteOffsetCalibrations)
      .calledWith()
      .thenReturn([
        mockPipetteOffsetCalibration1,
        mockPipetteOffsetCalibration2,
        mockPipetteOffsetCalibration3,
      ])
    when(useRobot).calledWith(ROBOT_NAME).thenReturn(mockConnectableRobot)
    when(useTipLengthCalibrations)
      .calledWith()
      .thenReturn([
        mockTipLengthCalibration1,
        mockTipLengthCalibration2,
        mockTipLengthCalibration3,
      ])
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: { data: [] },
    } as any)
    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [] },
    } as any)
    when(useIsEstopNotDisengaged).calledWith(ROBOT_NAME).thenReturn(false)
  })

  it('renders a title and description for OT2', () => {
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(false)
    render()
    screen.getByText('Download Calibration Data')
  })

  it('renders an OT-3 title and description - About Calibration', () => {
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(true)
    render()
    screen.queryByText(
      `For the robot to move accurately and precisely, you need to calibrate it. Pipette and gripper calibration is an automated process that uses a calibration probe or pin.`
    )
    screen.queryByText(
      `After calibration is complete, you can save the calibration data to your computer as a JSON file.`
    )
  })

  it('renders a download calibration data button', () => {
    render()
    const downloadButton = screen.getByText('Download calibration logs')
    fireEvent.click(downloadButton)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_CALIBRATION_DATA_DOWNLOADED,
      properties: { robotType: OT2_ROBOT_TYPE },
    })
  })

  it('renders a download calibration button for Flex when cal data is present', () => {
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(true)
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: { data: [instrumentsResponseFixture.data[0]] },
    } as any)
    render()
    const downloadButton = screen.getByText('Download calibration logs')
    fireEvent.click(downloadButton)
  })

  it('renders a See how robot calibration works link', () => {
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(true)
    render()
    const SUPPORT_LINK = 'https://support.opentrons.com'
    expect(
      screen
        .getByRole('link', {
          name: 'See how robot calibration works',
        })
        .getAttribute('href')
    ).toBe(SUPPORT_LINK)
  })

  it('renders correct title and description', () => {
    render()
    screen.getByText('Download Calibration Data')
    screen.getByText('Save all three types of calibration data as a JSON file.')

    const downloadButton = screen.getByText('Download calibration logs')
    expect(downloadButton).toBeEnabled()
  })

  // TODO: RAUT-94 Verify the logic for these three test conditions holds for the new calibration flow

  it('renders disabled button when deck is not calibrated', () => {
    when(useDeckCalibrationData)
      .calledWith(mockConnectableRobot.name)
      .thenReturn({
        deckCalibrationData: mockDeckCalData,
        isDeckCalibrated: false,
      })
    render()
    screen.getByText('No calibration data available.')

    const downloadButton = screen.getByRole('button', {
      name: 'Download calibration logs',
    })
    expect(downloadButton).toBeDisabled()
  })

  it('renders disabled button when pipettes are not calibrated', () => {
    when(usePipetteOffsetCalibrations).calledWith().thenReturn([])
    render()
    screen.getByText('No calibration data available.')

    const downloadButton = screen.getByRole('button', {
      name: 'Download calibration logs',
    })
    expect(downloadButton).toBeDisabled()
  })

  it('renders disabled button for Flex when no instrument is calibrated', () => {
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(true)
    render()
    screen.queryByText(
      `For the robot to move accurately and precisely, you need to calibrate it. Pipette and gripper calibration is an automated process that uses a calibration probe or pin.`
    )
    screen.queryByText(
      `After calibration is complete, you can save the calibration data to your computer as a JSON file.`
    )

    const downloadButton = screen.getByRole('button', {
      name: 'Download calibration logs',
    })
    expect(downloadButton).toBeEnabled() // allow download for empty cal data
  })

  it('renders disabled button when tip lengths are not calibrated', () => {
    when(useTipLengthCalibrations).calledWith().thenReturn([])
    render()
    screen.getByText('No calibration data available.')

    const downloadButton = screen.getByRole('button', {
      name: 'Download calibration logs',
    })
    expect(downloadButton).toBeDisabled()
  })

  it('renders disabled button when e-stop is pressed', () => {
    when(useIsFlex).calledWith(ROBOT_NAME).thenReturn(true)
    when(useIsEstopNotDisengaged).calledWith(ROBOT_NAME).thenReturn(true)
    render()
    const downloadButton = screen.getByRole('button', {
      name: 'Download calibration logs',
    })
    expect(downloadButton).toBeDisabled()
  })
})
