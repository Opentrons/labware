import { ChooseRobotSlideout } from '..'
import { i18n } from '../../../i18n'
import { getBuildrootUpdateDisplayInfo } from '../../../redux/buildroot'
import {
  getConnectableRobots,
  getReachableRobots,
  getScanning,
  getUnreachableRobots,
  startDiscovery,
} from '../../../redux/discovery'
import {
  mockConnectableRobot,
  mockReachableRobot,
  mockUnreachableRobot,
} from '../../../redux/discovery/__fixtures__'
import { renderWithProviders } from '@opentrons/components'
import { fireEvent } from '@testing-library/react'
import * as React from 'react'
import { StaticRouter } from 'react-router-dom'

jest.mock('../../../redux/discovery')
jest.mock('../../../redux/buildroot')

const mockGetBuildrootUpdateDisplayInfo = getBuildrootUpdateDisplayInfo as jest.MockedFunction<
  typeof getBuildrootUpdateDisplayInfo
>
const mockGetConnectableRobots = getConnectableRobots as jest.MockedFunction<
  typeof getConnectableRobots
>
const mockGetReachableRobots = getReachableRobots as jest.MockedFunction<
  typeof getReachableRobots
>
const mockGetUnreachableRobots = getUnreachableRobots as jest.MockedFunction<
  typeof getUnreachableRobots
>
const mockGetScanning = getScanning as jest.MockedFunction<typeof getScanning>
const mockStartDiscovery = startDiscovery as jest.MockedFunction<
  typeof startDiscovery
>

const render = (props: React.ComponentProps<typeof ChooseRobotSlideout>) => {
  return renderWithProviders(
    <StaticRouter>
      <ChooseRobotSlideout {...props} />
    </StaticRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

const mockSetSelectedRobot = jest.fn()

describe('ChooseRobotSlideout', () => {
  beforeEach(() => {
    mockGetBuildrootUpdateDisplayInfo.mockReturnValue({
      autoUpdateAction: '',
      autoUpdateDisabledReason: null,
      updateFromFileDisabledReason: null,
    })
    mockGetConnectableRobots.mockReturnValue([mockConnectableRobot])
    mockGetUnreachableRobots.mockReturnValue([mockUnreachableRobot])
    mockGetReachableRobots.mockReturnValue([mockReachableRobot])
    mockGetScanning.mockReturnValue(false)
    mockStartDiscovery.mockReturnValue({ type: 'mockStartDiscovery' } as any)
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders slideout if isExpanded true', () => {
    const [{ queryAllByText }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: jest.fn(),
      title: 'choose robot slideout title',
    })
    expect(queryAllByText('Choose Robot to Run')).not.toBeFalsy()
    expect(queryAllByText('fakeSrcFileName')).not.toBeFalsy()
  })
  it('does not render slideout if isExpanded false', () => {
    const [{ queryAllByText }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: jest.fn(),
      title: 'choose robot slideout title',
    })
    expect(queryAllByText('Choose Robot to Run').length).toEqual(0)
    expect(queryAllByText('fakeSrcFileName').length).toEqual(0)
  })
  it('shows a warning if the protocol has failed analysis', () => {
    const [{ getByText }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: jest.fn(),
      title: 'choose robot slideout title',
      isAnalysisError: true,
    })
    getByText(
      'This protocol failed in-app analysis. It may be unusable on robots without custom software configurations.'
    )
  })
  it('renders an available robot option for every connectable robot, and link for other robots', () => {
    const [{ queryByText }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: jest.fn(),
      title: 'choose robot slideout title',
    })
    expect(queryByText('opentrons-robot-name')).toBeInTheDocument()
    expect(
      queryByText('2 unavailable robots are not listed.')
    ).toBeInTheDocument()
  })
  it('if scanning, show robots, but do not show link to other devices', () => {
    mockGetScanning.mockReturnValue(true)
    const [{ queryByText }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: jest.fn(),
      title: 'choose robot slideout title',
    })
    expect(queryByText('opentrons-robot-name')).toBeInTheDocument()
    expect(
      queryByText('2 unavailable robots are not listed.')
    ).not.toBeInTheDocument()
  })
  it('if not scanning, show refresh button, start discovery if clicked', () => {
    const [{ getByRole }, { dispatch }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
    })
    const refreshButton = getByRole('button', { name: 'refresh' })
    fireEvent.click(refreshButton)
    expect(mockStartDiscovery).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'mockStartDiscovery' })
  })
  it('defaults to first available robot and allows an available robot to be selected', () => {
    mockGetConnectableRobots.mockReturnValue([
      { ...mockConnectableRobot, name: 'otherRobot', ip: 'otherIp' },
      mockConnectableRobot,
    ])
    const [{ getByText }] = render({
      onCloseClick: jest.fn(),
      isExpanded: true,
      selectedRobot: null,
      setSelectedRobot: mockSetSelectedRobot,
      title: 'choose robot slideout title',
    })
    expect(mockSetSelectedRobot).toBeCalledWith({
      ...mockConnectableRobot,
      name: 'otherRobot',
      ip: 'otherIp',
    })
    const mockRobot = getByText('opentrons-robot-name')
    mockRobot.click() // unselect default robot
    expect(mockSetSelectedRobot).toBeCalledWith(mockConnectableRobot)
    const otherRobot = getByText('otherRobot')
    otherRobot.click()
    expect(mockSetSelectedRobot).toBeCalledWith({
      ...mockConnectableRobot,
      name: 'otherRobot',
      ip: 'otherIp',
    })
  })
})
