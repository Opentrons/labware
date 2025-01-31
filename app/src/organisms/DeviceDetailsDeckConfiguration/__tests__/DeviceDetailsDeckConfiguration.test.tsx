import { fireEvent, screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { describe, it, beforeEach, vi, afterEach } from 'vitest'

import { TRASH_BIN_ADAPTER_FIXTURE } from '@opentrons/shared-data'
import { DeckConfigurator } from '@opentrons/components'
import {
  useModulesQuery,
  useUpdateDeckConfigurationMutation,
} from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useRunStatuses } from '/app/resources/runs'
import { useIsRobotViewable } from '/app/redux-resources/robots'
import { DeckFixtureSetupInstructionsModal } from '../DeckFixtureSetupInstructionsModal'
import { useIsEstopNotDisengaged } from '/app/resources/devices/hooks/useIsEstopNotDisengaged'
import { DeviceDetailsDeckConfiguration } from '../'
import { useNotifyCurrentMaintenanceRun } from '/app/resources/maintenance_runs'
import {
  useDeckConfigurationEditingTools,
  useNotifyDeckConfigurationQuery,
} from '/app/resources/deck_configuration'

import type { ComponentProps } from 'react'
import type { UseQueryResult } from 'react-query'
import type { MaintenanceRun } from '@opentrons/api-client'
import type { DeckConfiguration } from '@opentrons/shared-data'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    DeckConfigurator: vi.fn(),
  }
})
vi.mock('@opentrons/react-api-client')
vi.mock('../DeckFixtureSetupInstructionsModal')
vi.mock('/app/resources/runs')
vi.mock('/app/redux-resources/robots')
vi.mock('/app/resources/maintenance_runs')
vi.mock('/app/resources/devices/hooks/useIsEstopNotDisengaged')
vi.mock('/app/resources/deck_configuration')

const mockDeckConfig = [
  {
    cutoutId: 'cutoutC3',
    cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
  },
]
const ROBOT_NAME = 'otie'
const mockUpdateDeckConfiguration = vi.fn()
const RUN_STATUSES = {
  isRunRunning: false,
  isRunStill: false,
  isRunTerminal: false,
  isRunIdle: false,
}
const mockCurrnetMaintenanceRun = {
  data: { id: 'mockMaintenanceRunId' },
} as MaintenanceRun

const render = (
  props: ComponentProps<typeof DeviceDetailsDeckConfiguration>
) => {
  return renderWithProviders(<DeviceDetailsDeckConfiguration {...props} />, {
    i18nInstance: i18n,
  })
}

describe('DeviceDetailsDeckConfiguration', () => {
  let props: ComponentProps<typeof DeviceDetailsDeckConfiguration>

  beforeEach(() => {
    props = {
      robotName: ROBOT_NAME,
    }
    vi.mocked(useModulesQuery).mockReturnValue({ data: { data: [] } } as any)
    vi.mocked(useUpdateDeckConfigurationMutation).mockReturnValue({
      updateDeckConfiguration: mockUpdateDeckConfiguration,
    } as any)
    vi.mocked(DeckFixtureSetupInstructionsModal).mockReturnValue(
      <div>mock DeckFixtureSetupInstructionsModal</div>
    )
    vi.mocked(DeckConfigurator).mockReturnValue(
      <div>mock DeckConfigurator</div>
    )
    vi.mocked(useRunStatuses).mockReturnValue(RUN_STATUSES)
    vi.mocked(useNotifyCurrentMaintenanceRun).mockReturnValue({
      data: {},
    } as any)
    when(vi.mocked(useIsEstopNotDisengaged))
      .calledWith(ROBOT_NAME)
      .thenReturn(false)
    when(vi.mocked(useIsRobotViewable)).calledWith(ROBOT_NAME).thenReturn(true)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: mockDeckConfig,
    } as UseQueryResult<DeckConfiguration>)
    vi.mocked(useDeckConfigurationEditingTools).mockReturnValue({
      addFixtureToCutout: vi.fn(),
      removeFixtureFromCutout: vi.fn(),
      addFixtureModal: null,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render text and button', () => {
    render(props)
    screen.getByText('otie deck configuration')
    screen.getByRole('button', { name: 'Setup Instructions' })
    screen.getByText('Location')
    screen.getByText('Deck hardware')
    screen.getByText('mock DeckConfigurator')
  })

  it('should render DeckFixtureSetupInstructionsModal when clicking text button', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Setup Instructions' }))
    screen.getByText('mock DeckFixtureSetupInstructionsModal')
  })

  it('should render banner and make deck configurator disabled when running', () => {
    RUN_STATUSES.isRunRunning = true
    vi.mocked(useRunStatuses).mockReturnValue(RUN_STATUSES)
    vi.mocked(DeckConfigurator).mockReturnValue(
      <div>disabled mock DeckConfigurator</div>
    )
    render(props)
    screen.getByText(
      'Deck configuration is not available when run is in progress'
    )
    screen.getByText('disabled mock DeckConfigurator')
  })

  it('should render banner and make deck configurator disabled when a maintenance run exists', () => {
    vi.mocked(useNotifyCurrentMaintenanceRun).mockReturnValue({
      data: mockCurrnetMaintenanceRun,
    } as any)
    vi.mocked(DeckConfigurator).mockReturnValue(
      <div>disabled mock DeckConfigurator</div>
    )
    render(props)
    screen.getByText(
      'Deck configuration is not available when the robot is busy'
    )
    screen.getByText('disabled mock DeckConfigurator')
  })

  it('should render no deck fixtures, if deck configs are not set', () => {
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [],
    } as any)
    render(props)
    screen.getByText('No deck fixtures')
  })

  it('should render disabled deck configurator when e-stop is pressed', () => {
    when(vi.mocked(useIsEstopNotDisengaged))
      .calledWith(ROBOT_NAME)
      .thenReturn(true)
    vi.mocked(DeckConfigurator).mockReturnValue(
      <div>disabled mock DeckConfigurator</div>
    )
    render(props)
    screen.getByText('disabled mock DeckConfigurator')
  })

  it('should render not viewable text when robot is not viewable', () => {
    when(vi.mocked(useIsRobotViewable)).calledWith(ROBOT_NAME).thenReturn(false)
    render(props)
    screen.getByText('Robot must be on the network to see deck configuration')
  })
})
