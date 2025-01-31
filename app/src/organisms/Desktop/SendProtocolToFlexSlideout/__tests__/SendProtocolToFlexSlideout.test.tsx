import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { MemoryRouter } from 'react-router-dom'

import {
  mockOT3HealthResponse,
  mockOT3ServerHealthResponse,
} from '../../../../../../discovery-client/src/fixtures'
import { useCreateProtocolMutation } from '@opentrons/react-api-client'

import { mockSuccessQueryResults } from '/app/__fixtures__'
import { i18n } from '/app/i18n'
import { useToaster } from '/app/organisms/ToasterOven'
import {
  getConnectableRobots,
  getReachableRobots,
  getScanning,
  getUnreachableRobots,
  startDiscovery,
  ROBOT_MODEL_OT2,
  ROBOT_MODEL_OT3,
} from '/app/redux/discovery'
import { getValidCustomLabwareFiles } from '/app/redux/custom-labware'
import { renderWithProviders } from '/app/__testing-utils__'
import { useIsRobotOnWrongVersionOfSoftware } from '/app/redux/robot-update'
import {
  mockConnectableRobot,
  mockReachableRobot,
  mockUnreachableRobot,
} from '/app/redux/discovery/__fixtures__'
import { getNetworkInterfaces } from '/app/redux/networking'
import { getIsProtocolAnalysisInProgress } from '/app/redux/protocol-storage/selectors'
import { storedProtocolData as storedProtocolDataFixture } from '/app/redux/protocol-storage/__fixtures__'
import { SendProtocolToFlexSlideout } from '..'
import { useNotifyAllRunsQuery } from '/app/resources/runs'

import type { ComponentProps } from 'react'
import type * as ApiClient from '@opentrons/react-api-client'

vi.mock('@opentrons/react-api-client', async importOriginal => {
  const actual = await importOriginal<typeof ApiClient>()
  return {
    ...actual,
    useCreateProtocolMutation: vi.fn(),
  }
})
vi.mock('/app/organisms/ToasterOven')
vi.mock('/app/redux/robot-update')
vi.mock('/app/redux/discovery')
vi.mock('/app/redux/networking')
vi.mock('/app/redux/custom-labware')
vi.mock('/app/redux/protocol-storage/selectors')
vi.mock('/app/resources/runs')

const render = (props: ComponentProps<typeof SendProtocolToFlexSlideout>) => {
  return renderWithProviders(
    <MemoryRouter>
      <SendProtocolToFlexSlideout {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockConnectableOT3 = {
  ...mockConnectableRobot,
  health: mockOT3HealthResponse,
  serverHealth: mockOT3ServerHealthResponse,
  robotModel: ROBOT_MODEL_OT3,
}
const mockReachableOT3 = {
  ...mockReachableRobot,
  health: mockOT3HealthResponse,
  serverHealth: mockOT3ServerHealthResponse,
  robotModel: ROBOT_MODEL_OT3,
}
const mockUnreachableOT3 = {
  ...mockUnreachableRobot,
  health: mockOT3HealthResponse,
  serverHealth: mockOT3ServerHealthResponse,
  robotModel: ROBOT_MODEL_OT3,
}

const mockMakeSnackbar = vi.fn()
const mockMakeToast = vi.fn()
const mockEatToast = vi.fn()
const mockMutateAsync = vi.fn()
const mockCustomLabwareFile: File = { path: 'fake_custom_labware_path' } as any

describe('SendProtocolToFlexSlideout', () => {
  beforeEach(() => {
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(false)
    vi.mocked(getConnectableRobots).mockReturnValue([mockConnectableOT3])
    vi.mocked(getUnreachableRobots).mockReturnValue([mockUnreachableOT3])
    vi.mocked(getReachableRobots).mockReturnValue([mockReachableOT3])
    vi.mocked(getScanning).mockReturnValue(false)
    vi.mocked(startDiscovery).mockReturnValue({
      type: 'mockStartDiscovery',
    } as any)
    vi.mocked(getIsProtocolAnalysisInProgress).mockReturnValue(false)
    vi.mocked(useToaster).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
      makeToast: mockMakeToast,
      eatToast: mockEatToast,
    })
    vi.mocked(useNotifyAllRunsQuery).mockReturnValue(
      mockSuccessQueryResults({
        data: [],
        links: {},
      })
    )
    vi.mocked(useCreateProtocolMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
    } as any)
    vi.mocked(mockMutateAsync).mockImplementation(() => Promise.resolve())
    vi.mocked(getNetworkInterfaces).mockReturnValue({
      wifi: null,
      ethernet: null,
    })
    vi.mocked(getValidCustomLabwareFiles).mockReturnValue([
      mockCustomLabwareFile,
    ])
  })

  it('renders slideout title and button', () => {
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    screen.getByText('Send protocol to Opentrons Flex')
    screen.getByRole('button', { name: 'Send' })
  })

  it('renders an available robot option for every connectable OT-3, and link for other robots', () => {
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    vi.mocked(getUnreachableRobots).mockReturnValue([
      { ...mockUnreachableRobot, robotModel: 'OT-3 Standard' },
    ])
    vi.mocked(getReachableRobots).mockReturnValue([
      { ...mockReachableRobot, robotModel: 'OT-3 Standard' },
    ])
    screen.getByText('opentrons-robot-name')
    screen.getByText('2 unavailable robots are not listed.')
  })
  it('does render a robot option for a busy OT-3', () => {
    vi.mocked(useNotifyAllRunsQuery).mockReturnValue(
      mockSuccessQueryResults({
        data: [],
        links: { current: { href: 'a current run' } },
      })
    )
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    expect(screen.getByText('opentrons-robot-name')).toBeInTheDocument()
  })
  it('does not render an available robot option for a connectable OT-2', () => {
    vi.mocked(getConnectableRobots).mockReturnValue([
      mockConnectableOT3,
      {
        ...mockConnectableRobot,
        name: 'ot-2-robot-name',
        robotModel: ROBOT_MODEL_OT2,
      },
    ])
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    expect(screen.queryByText('ot-2-robot-name')).not.toBeInTheDocument()
  })
  it('if scanning, show robots, but do not show link to other devices', () => {
    vi.mocked(getScanning).mockReturnValue(true)
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    screen.getByText('opentrons-robot-name')
    expect(
      screen.queryByText('2 unavailable or busy robots are not listed.')
    ).not.toBeInTheDocument()
  })
  it('if not scanning, show refresh button, start discovery if clicked', () => {
    const { dispatch } = render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })[1]
    const refresh = screen.getByRole('button', { name: 'refresh' })
    fireEvent.click(refresh)
    expect(startDiscovery).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'mockStartDiscovery' })
  })
  it('defaults to first available robot and allows an available robot to be selected', () => {
    vi.mocked(getConnectableRobots).mockReturnValue([
      { ...mockConnectableOT3, name: 'otherRobot', ip: 'otherIp' },
      mockConnectableOT3,
    ])
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    const proceedButton = screen.getByRole('button', { name: 'Send' })
    expect(proceedButton).not.toBeDisabled()
    const otherRobot = screen.getByText('otherRobot')
    fireEvent.click(otherRobot) // unselect default robot
    expect(proceedButton).not.toBeDisabled()
    const mockRobot = screen.getByText('opentrons-robot-name')
    fireEvent.click(mockRobot)
    expect(proceedButton).not.toBeDisabled()
    fireEvent.click(proceedButton)
    expect(mockMutateAsync).toBeCalledWith({
      files: [expect.any(Object), mockCustomLabwareFile],
      protocolKey: 'protocolKeyStub',
    })
  })
  it('if selected robot is on a different version of the software than the app, disable CTA and show link to device details in options', () => {
    vi.mocked(useIsRobotOnWrongVersionOfSoftware).mockReturnValue(true)
    render({
      storedProtocolData: storedProtocolDataFixture,
      onCloseClick: vi.fn(),
      isExpanded: true,
    })
    const proceedButton = screen.getByRole('button', { name: 'Send' })
    expect(proceedButton).toBeDisabled()
    expect(
      screen.getByText(
        'A robot software update is required to run protocols with this version of the Opentrons App.'
      )
    ).toBeInTheDocument()
    const linkToRobotDetails = screen.getByText('Go to Robot')
    fireEvent.click(linkToRobotDetails)
  })
})
