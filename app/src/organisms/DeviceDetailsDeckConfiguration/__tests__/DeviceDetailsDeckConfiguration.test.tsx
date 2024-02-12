import * as React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { when, resetAllWhenMocks } from 'jest-when'

import {
  DeckConfigurator,
  partialComponentPropsMatcher,
  renderWithProviders,
} from '@opentrons/components'
import {
  useDeckConfigurationQuery,
  useUpdateDeckConfigurationMutation,
} from '@opentrons/react-api-client'

import { i18n } from '../../../i18n'
import { useIsRobotViewable, useRunStatuses } from '../../Devices/hooks'
import { DeckFixtureSetupInstructionsModal } from '../DeckFixtureSetupInstructionsModal'
import { useIsEstopNotDisengaged } from '../../../resources/devices/hooks/useIsEstopNotDisengaged'
import { DeviceDetailsDeckConfiguration } from '../'
import { useNotifyCurrentMaintenanceRun } from '../../../resources/maintenance_runs/useNotifyCurrentMaintenanceRun'

import type { MaintenanceRun } from '@opentrons/api-client'

jest.mock('@opentrons/components/src/hardware-sim/DeckConfigurator/index')
jest.mock('@opentrons/react-api-client')
jest.mock('../DeckFixtureSetupInstructionsModal')
jest.mock('../../Devices/hooks')
jest.mock('../../../resources/maintenance_runs/useNotifyCurrentMaintenanceRun')
jest.mock('../../../resources/devices/hooks/useIsEstopNotDisengaged')

const ROBOT_NAME = 'otie'
const mockUpdateDeckConfiguration = jest.fn()
const RUN_STATUSES = {
  isRunRunning: false,
  isRunStill: false,
  isRunTerminal: false,
  isRunIdle: false,
}
const mockCurrnetMaintenanceRun = {
  data: { id: 'mockMaintenanceRunId' },
} as MaintenanceRun

const mockUseDeckConfigurationQuery = useDeckConfigurationQuery as jest.MockedFunction<
  typeof useDeckConfigurationQuery
>
const mockUseUpdateDeckConfigurationMutation = useUpdateDeckConfigurationMutation as jest.MockedFunction<
  typeof useUpdateDeckConfigurationMutation
>
const mockDeckFixtureSetupInstructionsModal = DeckFixtureSetupInstructionsModal as jest.MockedFunction<
  typeof DeckFixtureSetupInstructionsModal
>
const mockDeckConfigurator = DeckConfigurator as jest.MockedFunction<
  typeof DeckConfigurator
>
const mockUseRunStatuses = useRunStatuses as jest.MockedFunction<
  typeof useRunStatuses
>
const mockUseNotifyCurrentMaintenanceRun = useNotifyCurrentMaintenanceRun as jest.MockedFunction<
  typeof useNotifyCurrentMaintenanceRun
>
const mockUseIsEstopNotDisengaged = useIsEstopNotDisengaged as jest.MockedFunction<
  typeof useIsEstopNotDisengaged
>
const mockUseIsRobotViewable = useIsRobotViewable as jest.MockedFunction<
  typeof useIsRobotViewable
>

const render = (
  props: React.ComponentProps<typeof DeviceDetailsDeckConfiguration>
) => {
  return renderWithProviders(<DeviceDetailsDeckConfiguration {...props} />, {
    i18nInstance: i18n,
  })
}

describe('DeviceDetailsDeckConfiguration', () => {
  let props: React.ComponentProps<typeof DeviceDetailsDeckConfiguration>

  beforeEach(() => {
    props = {
      robotName: ROBOT_NAME,
    }
    mockUseDeckConfigurationQuery.mockReturnValue({ data: [] } as any)
    mockUseUpdateDeckConfigurationMutation.mockReturnValue({
      updateDeckConfiguration: mockUpdateDeckConfiguration,
    } as any)
    mockDeckFixtureSetupInstructionsModal.mockReturnValue(
      <div>mock DeckFixtureSetupInstructionsModal</div>
    )
    when(mockDeckConfigurator).mockReturnValue(<div>mock DeckConfigurator</div>)
    mockUseRunStatuses.mockReturnValue(RUN_STATUSES)
    mockUseNotifyCurrentMaintenanceRun.mockReturnValue({
      data: {},
    } as any)
    when(mockUseIsEstopNotDisengaged)
      .calledWith(ROBOT_NAME)
      .mockReturnValue(false)
    when(mockUseIsRobotViewable).calledWith(ROBOT_NAME).mockReturnValue(true)
  })

  afterEach(() => {
    resetAllWhenMocks()
  })

  it('should render text and button', () => {
    render(props)
    screen.getByText('otie deck configuration')
    screen.getByRole('button', { name: 'Setup Instructions' })
    screen.getByText('Location')
    screen.getByText('Fixture')
    screen.getByText('mock DeckConfigurator')
  })

  it('should render DeckFixtureSetupInstructionsModal when clicking text button', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Setup Instructions' }))
    screen.getByText('mock DeckFixtureSetupInstructionsModal')
  })

  it('should render banner and make deck configurator disabled when running', () => {
    RUN_STATUSES.isRunRunning = true
    mockUseRunStatuses.mockReturnValue(RUN_STATUSES)
    when(mockDeckConfigurator)
      .calledWith(partialComponentPropsMatcher({ readOnly: true }))
      .mockReturnValue(<div>disabled mock DeckConfigurator</div>)
    render(props)
    screen.getByText(
      'Deck configuration is not available when run is in progress'
    )
    screen.getByText('disabled mock DeckConfigurator')
  })

  it('should render banner and make deck configurator disabled when a maintenance run exists', () => {
    mockUseNotifyCurrentMaintenanceRun.mockReturnValue({
      data: mockCurrnetMaintenanceRun,
    } as any)
    when(mockDeckConfigurator)
      .calledWith(partialComponentPropsMatcher({ readOnly: true }))
      .mockReturnValue(<div>disabled mock DeckConfigurator</div>)
    render(props)
    screen.getByText(
      'Deck configuration is not available when the robot is busy'
    )
    screen.getByText('disabled mock DeckConfigurator')
  })

  it('should render no deck fixtures, if deck configs are not set', () => {
    when(mockUseDeckConfigurationQuery)
      .calledWith()
      .mockReturnValue([] as any)
    render(props)
    screen.getByText('No deck fixtures')
  })

  it('should render disabled deck configurator when e-stop is pressed', () => {
    when(mockUseIsEstopNotDisengaged)
      .calledWith(ROBOT_NAME)
      .mockReturnValue(true)
    when(mockDeckConfigurator)
      .calledWith(partialComponentPropsMatcher({ readOnly: true }))
      .mockReturnValue(<div>disabled mock DeckConfigurator</div>)
    render(props)
    screen.getByText('disabled mock DeckConfigurator')
  })

  it('should render not viewable text when robot is not viewable', () => {
    when(mockUseIsRobotViewable).calledWith(ROBOT_NAME).mockReturnValue(false)
    render(props)
    screen.getByText('Robot must be on the network to see deck configuration')
  })
})
