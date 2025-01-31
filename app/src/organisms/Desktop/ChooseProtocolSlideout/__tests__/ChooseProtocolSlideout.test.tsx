import { vi, it, describe, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen, waitFor } from '@testing-library/react'

import {
  OT2_ROBOT_TYPE,
  simpleAnalysisFileFixture,
} from '@opentrons/shared-data'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { getStoredProtocols } from '/app/redux/protocol-storage'
import { mockConnectableRobot } from '/app/redux/discovery/__fixtures__'
import {
  storedProtocolData as storedProtocolDataFixture,
  storedProtocolDataWithoutRunTimeParameters,
} from '/app/redux/protocol-storage/__fixtures__'
import { useTrackCreateProtocolRunEvent } from '/app/organisms/Desktop/Devices/hooks'
import { useCreateRunFromProtocol } from '/app/organisms/Desktop/ChooseRobotToRunProtocolSlideout/useCreateRunFromProtocol'
import { ChooseProtocolSlideout } from '../'
import { useNotifyDataReady } from '/app/resources/useNotifyDataReady'

import type { ComponentProps } from 'react'
import type { ProtocolAnalysisOutput } from '@opentrons/shared-data'

vi.mock(
  '/app/organisms/Desktop/ChooseRobotToRunProtocolSlideout/useCreateRunFromProtocol'
)
vi.mock('/app/redux/protocol-storage')
vi.mock('/app/organisms/Desktop/Devices/hooks')
vi.mock('/app/redux/config')
vi.mock('/app/resources/useNotifyDataReady')

const render = (props: ComponentProps<typeof ChooseProtocolSlideout>) => {
  return renderWithProviders(
    <MemoryRouter>
      <ChooseProtocolSlideout {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const modifiedSimpleAnalysisFileFixture = {
  ...simpleAnalysisFileFixture,
  robotType: OT2_ROBOT_TYPE,
}
const mockStoredProtocolDataFixture = [
  {
    ...storedProtocolDataFixture,
    mostRecentAnalysis: ({
      ...modifiedSimpleAnalysisFileFixture,
      runTimeParameters: [],
    } as any) as ProtocolAnalysisOutput,
  },
]

describe('ChooseProtocolSlideout', () => {
  let mockCreateRunFromProtocol = vi.fn()
  let mockTrackCreateProtocolRunEvent = vi.fn()
  beforeEach(() => {
    mockCreateRunFromProtocol = vi.fn()
    mockTrackCreateProtocolRunEvent = vi.fn(
      () => new Promise(resolve => resolve({}))
    )
    vi.mocked(getStoredProtocols).mockReturnValue(mockStoredProtocolDataFixture)
    vi.mocked(useCreateRunFromProtocol).mockReturnValue({
      createRunFromProtocolSource: mockCreateRunFromProtocol,
      reset: vi.fn(),
    } as any)
    vi.mocked(useTrackCreateProtocolRunEvent).mockReturnValue({
      trackCreateProtocolRunEvent: mockTrackCreateProtocolRunEvent,
    })
    vi.mocked(useNotifyDataReady).mockReturnValue({} as any)
  })

  it('renders slideout if showSlideout true', () => {
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    screen.getByText(/choose protocol to run/i)
    screen.getByText(/opentrons-robot-name/i)
  })

  it('renders an available protocol option for every stored protocol if any', () => {
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    screen.getByLabelText('protocol deck map')
    screen.getByText('fakeSrcFileName')
    expect(
      screen.queryByRole('heading', { name: 'No protocols found' })
    ).toBeNull()
  })

  it('renders an empty state if no protocol options', () => {
    vi.mocked(getStoredProtocols).mockReturnValue([])
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    expect(screen.queryByLabelText('protocol deck map')).toBeNull()
    expect(screen.queryByText('fakeSrcFileName')).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'No protocols found' })
    ).toBeInTheDocument()
  })

  it('calls createRunFromProtocolSource if CTA clicked', async () => {
    const protocolDataWithoutRunTimeParameter = {
      ...storedProtocolDataWithoutRunTimeParameters,
    }
    vi.mocked(getStoredProtocols).mockReturnValue([
      protocolDataWithoutRunTimeParameter,
    ])
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    const proceedButton = screen.getByRole('button', {
      name: 'Proceed to setup',
    })
    fireEvent.click(proceedButton)
    await waitFor(() =>
      expect(mockCreateRunFromProtocol).toHaveBeenCalledWith({
        files: [expect.any(File)],
        protocolKey: storedProtocolDataFixture.protocolKey,
        runTimeParameterValues: expect.any(Object),
        runTimeParameterFiles: expect.any(Object),
      })
    )
    expect(mockTrackCreateProtocolRunEvent).toHaveBeenCalled()
  })

  it('move to the second slideout if CTA clicked', () => {
    const protocolDataWithoutRunTimeParameter = {
      ...storedProtocolDataFixture,
    }
    vi.mocked(getStoredProtocols).mockReturnValue([
      protocolDataWithoutRunTimeParameter,
    ])
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    const proceedButton = screen.getByRole('button', {
      name: 'Continue to parameters',
    })
    fireEvent.click(proceedButton)
    screen.getByText('Step 2 / 2')
    screen.getByText('number of samples')
    screen.getByText('Restore default values')
  })

  it('shows tooltip when disabled Restore default values link is clicked', () => {
    const protocolDataWithoutRunTimeParameter = {
      ...storedProtocolDataFixture,
    }
    vi.mocked(getStoredProtocols).mockReturnValue([
      protocolDataWithoutRunTimeParameter,
    ])

    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    const proceedButton = screen.getByRole('button', {
      name: 'Continue to parameters',
    })
    fireEvent.click(proceedButton)
    const restoreValuesLink = screen.getByText('Restore default values')
    fireEvent.click(restoreValuesLink)
    screen.getByText('No custom values specified')
  })

  // ToDo (kk:04/18/2024) I will update test for RTP
  /*
  it('renders error state when there is a run creation error', () => {
    vi.mocked(useCreateRunFromProtocol).mockReturnValue({
      runCreationError: 'run creation error',
      createRunFromProtocolSource: mockCreateRunFromProtocol,
      isCreatingRun: false,
      reset: vi.fn(),
      runCreationErrorCode: 500,
    })
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    const proceedButton = screen.getByRole('button', {
      name: 'Proceed to setup',
    })
    fireEvent.click(proceedButton)
    expect(mockCreateRunFromProtocol).toHaveBeenCalledWith({
      files: [expect.any(File)],
      protocolKey: storedProtocolDataFixture.protocolKey,
    })
    expect(mockTrackCreateProtocolRunEvent).toHaveBeenCalled()
    expect(screen.getByText('run creation error')).toBeInTheDocument()
  })

  it('renders error state when run creation error code is 409', () => {
    vi.mocked(useCreateRunFromProtocol).mockReturnValue({
      runCreationError: 'Current run is not idle or stopped.',
      createRunFromProtocolSource: mockCreateRunFromProtocol,
      isCreatingRun: false,
      reset: vi.fn(),
      runCreationErrorCode: 409,
    })
    render({
      robot: mockConnectableRobot,
      onCloseClick: vi.fn(),
      showSlideout: true,
    })
    const proceedButton = screen.getByRole('button', {
      name: 'Proceed to setup',
    })
    fireEvent.click(proceedButton)
    expect(mockCreateRunFromProtocol).toHaveBeenCalledWith({
      files: [expect.any(File)],
      protocolKey: storedProtocolDataFixture.protocolKey,
    })
    expect(mockTrackCreateProtocolRunEvent).toHaveBeenCalled()
    screen.getByText(
      'This robot is busy and can’t run this protocol right now.'
    )
    const link = screen.getByRole('link', { name: 'Go to Robot' })
    fireEvent.click(link)
    expect(link.getAttribute('href')).toEqual('/devices/opentrons-robot-name')
  })
  */
})
