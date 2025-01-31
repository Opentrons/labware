import { vi, it, describe, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  getConnectableRobots,
  getReachableRobots,
  getScanning,
  getUnreachableRobots,
  startDiscovery,
} from '/app/redux/discovery'
import {
  mockConnectableRobot,
  mockReachableRobot,
  mockUnreachableRobot,
} from '/app/redux/discovery/__fixtures__'
import { getNetworkInterfaces } from '/app/redux/networking'
import { ChooseRobotSlideout } from '..'
import { useNotifyDataReady } from '/app/resources/useNotifyDataReady'

import type { ComponentProps } from 'react'
import type { RunTimeParameter } from '@opentrons/shared-data'

vi.mock('/app/redux/discovery')
vi.mock('/app/redux/robot-update')
vi.mock('/app/redux/networking')
vi.mock('/app/resources/useNotifyDataReady')
const render = (props: ComponentProps<typeof ChooseRobotSlideout>) => {
  return renderWithProviders(
    <MemoryRouter>
      <ChooseRobotSlideout {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockSetSelectedRobot = vi.fn()

const mockRunTimeParameters: RunTimeParameter[] = [
  {
    displayName: 'Dry Run',
    value: false,
    variableName: 'DRYRUN',
    description: 'Is this a dry or wet run? Wet is true, dry is false',
    type: 'bool',
    default: false,
  },
  {
    value: 4,
    displayName: 'Columns of Samples',
    variableName: 'COLUMNS',
    description: 'How many columns do you want?',
    type: 'int',
    min: 1,
    max: 14,
    default: 4,
  },
  {
    value: 6.5,
    displayName: 'EtoH Volume',
    variableName: 'ETOH_VOLUME',
    description: '70% ethanol volume',
    type: 'float',
    suffix: 'mL',
    min: 1.5,
    max: 10.0,
    default: 6.5,
  },
  {
    value: 'none',
    displayName: 'Default Module Offsets',
    variableName: 'DEFAULT_OFFSETS',
    description: 'default module offsets for temp, H-S, and none',
    type: 'str',
    choices: [
      {
        displayName: 'No offsets',
        value: 'none',
      },
      {
        displayName: 'temp offset',
        value: '1',
      },
      {
        displayName: 'heater-shaker offset',
        value: '2',
      },
    ],
    default: 'none',
  },
]

describe('ChooseRobotSlideout', () => {
  beforeEach(() => {
    vi.mocked(getConnectableRobots).mockReturnValue([mockConnectableRobot])
    vi.mocked(getUnreachableRobots).mockReturnValue([mockUnreachableRobot])
    vi.mocked(getReachableRobots).mockReturnValue([mockReachableRobot])
    vi.mocked(getScanning).mockReturnValue(false)
    vi.mocked(startDiscovery).mockReturnValue({
      type: 'mockStartDiscovery',
    } as any)
    vi.mocked(getNetworkInterfaces).mockReturnValue({
      wifi: null,
      ethernet: null,
    })
    vi.mocked(useNotifyDataReady).mockReturnValue({} as any)
  })

  it('renders slideout if isExpanded true', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: vi.fn(),
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
    })
    screen.getByText('choose robot slideout title')
  })
  it('shows a warning if the protocol has failed analysis', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: vi.fn(),
      title: 'choose robot slideout title',
      isAnalysisError: true,
      robotType: OT2_ROBOT_TYPE,
    })
    screen.getByText(
      'This protocol failed in-app analysis. It may be unusable on robots without custom software configurations.'
    )
  })
  it('renders an available robot option for every connectable robot, and link for other robots', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: vi.fn(),
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
    })
    screen.getByText('opentrons-robot-name')
    screen.getByText('2 unavailable robots are not listed.')
  })
  it('if scanning, show robots, but do not show link to other devices', () => {
    vi.mocked(getScanning).mockReturnValue(true)
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: vi.fn(),
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
    })
    screen.getByText('opentrons-robot-name')
    expect(
      screen.queryByText('2 unavailable robots are not listed.')
    ).not.toBeInTheDocument()
  })
  it('if not scanning, show refresh button, start discovery if clicked', () => {
    const { dispatch } = render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
    })[1]
    const refreshButton = screen.getByRole('button', { name: 'refresh' })
    fireEvent.click(refreshButton)
    expect(vi.mocked(startDiscovery)).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'mockStartDiscovery' })
  })
  it('renders the multi slideout page 1', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
      multiSlideout: { currentPage: 1 },
    })
    screen.getByText('Step 1 / 2')
  })
  it('renders the multi slideout page 2', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
      multiSlideout: { currentPage: 2 },
    })
    screen.getByText('Step 2 / 2')
  })

  mockRunTimeParameters.forEach(param => {
    it('renders runtime parameter with title and caption', () => {
      render({
        onCloseClick: vi.fn(),
        isExpanded: true,
        isSelectedRobotOnDifferentSoftwareVersion: false,
        selectedRobot: null,
        setSelectedRobot: mockSetSelectedRobot,
        title: 'choose robot slideout title',
        robotType: OT2_ROBOT_TYPE,
        multiSlideout: { currentPage: 2 },
        runTimeParametersOverrides: [param],
      })

      screen.getByText(param.displayName)
      if (!('choices' in param)) {
        if (param.type === 'bool') {
          screen.getByText(param.description)
        }
        if (param.type === 'int') {
          screen.getByText(`${param.min}-${param.max}`)
        }
        if (param.type === 'float') {
          screen.getByText(`${param.min.toFixed(1)}-${param.max.toFixed(1)}`)
        }
      }
    })
  })

  it('renders error message for runtime parameter out of range', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
      multiSlideout: { currentPage: 2 },
      runTimeParametersOverrides: [
        {
          value: 1000,
          displayName: 'EtoH Volume',
          variableName: 'ETOH_VOLUME',
          description: '70% ethanol volume',
          type: 'float',
          suffix: 'mL',
          min: 1.5,
          max: 10.0,
          default: 6.5,
        },
      ],
    })
    screen.getByText('Value must be between 1.5-10.0')
  })

  it('defaults to first available robot and allows an available robot to be selected', () => {
    vi.mocked(getConnectableRobots).mockReturnValue([
      { ...mockConnectableRobot, name: 'otherRobot', ip: 'otherIp' },
      mockConnectableRobot,
    ])
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
    })
    expect(mockSetSelectedRobot).toBeCalledWith({
      ...mockConnectableRobot,
      name: 'otherRobot',
      ip: 'otherIp',
    })
    const mockRobot = screen.getByText('opentrons-robot-name')
    fireEvent.click(mockRobot) // unselect default robot
    expect(mockSetSelectedRobot).toBeCalledWith(mockConnectableRobot)
    const otherRobot = screen.getByText('otherRobot')
    fireEvent.click(otherRobot)
    expect(mockSetSelectedRobot).toBeCalledWith({
      ...mockConnectableRobot,
      name: 'otherRobot',
      ip: 'otherIp',
    })
  })

  it('sets selected robot to null if no available robots', () => {
    vi.mocked(getConnectableRobots).mockReturnValue([])
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
    })
    expect(mockSetSelectedRobot).toBeCalledWith(null)
  })

  it('shows tooltip when disabled Restore default values link is clicked', () => {
    render({
      onCloseClick: vi.fn(),
      isExpanded: true,
      isSelectedRobotOnDifferentSoftwareVersion: false,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
      robotType: OT2_ROBOT_TYPE,
      multiSlideout: { currentPage: 2 },
      runTimeParametersOverrides: mockRunTimeParameters,
    })

    const restoreValuesLink = screen.getByText('Restore default values')
    fireEvent.click(restoreValuesLink)
    screen.getByText('No custom values specified')
  })
})
