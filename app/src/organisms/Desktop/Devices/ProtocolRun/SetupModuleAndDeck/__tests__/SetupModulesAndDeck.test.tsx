import { when } from 'vitest-when'
import { describe, it, beforeEach, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockTemperatureModule } from '/app/redux/modules/__fixtures__'
import {
  getIsFixtureMismatch,
  getRequiredDeckConfig,
} from '/app/resources/deck_configuration/utils'
import {
  useRunHasStarted,
  useModuleCalibrationStatus,
  useUnmatchedModulesForProtocol,
} from '/app/resources/runs'
import { useIsFlex } from '/app/redux-resources/robots'
import { SetupModuleAndDeck } from '../index'
import { SetupModulesList } from '../SetupModulesList'
import { SetupModulesMap } from '../SetupModulesMap'
import { SetupFixtureList } from '../SetupFixtureList'

import type { ComponentProps } from 'react'

vi.mock('/app/redux-resources/robots')
vi.mock('../SetupModulesList')
vi.mock('../SetupModulesMap')
vi.mock('../SetupFixtureList')
vi.mock('/app/redux/config')
vi.mock('/app/resources/deck_configuration/utils')
vi.mock('/app/resources/runs')

const MOCK_ROBOT_NAME = 'otie'
const MOCK_RUN_ID = '1'

const render = (props: ComponentProps<typeof SetupModuleAndDeck>) => {
  return renderWithProviders(<SetupModuleAndDeck {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('SetupModuleAndDeck', () => {
  let props: ComponentProps<typeof SetupModuleAndDeck>
  beforeEach(() => {
    props = {
      robotName: MOCK_ROBOT_NAME,
      runId: MOCK_RUN_ID,
      expandLabwarePositionCheckStep: () => vi.fn(),
      hasModules: true,
      protocolAnalysis: null,
    }
    vi.mocked(SetupFixtureList).mockReturnValue(
      <div>Mock setup fixture list</div>
    )
    vi.mocked(SetupModulesList).mockReturnValue(
      <div>Mock setup modules list</div>
    )
    vi.mocked(SetupModulesMap).mockReturnValue(
      <div>Mock setup modules map</div>
    )
    vi.mocked(useRunHasStarted).mockReturnValue(false)
    when(useUnmatchedModulesForProtocol)
      .calledWith(MOCK_ROBOT_NAME, MOCK_RUN_ID)
      .thenReturn({
        missingModuleIds: [],
        remainingAttachedModules: [],
      })
    when(useModuleCalibrationStatus)
      .calledWith(MOCK_ROBOT_NAME, MOCK_RUN_ID)
      .thenReturn({ complete: true })
    when(useIsFlex).calledWith(MOCK_ROBOT_NAME).thenReturn(false)
    vi.mocked(getRequiredDeckConfig).mockReturnValue([])
    vi.mocked(getIsFixtureMismatch).mockReturnValue(false)
  })

  it('renders the list and map view buttons', () => {
    render(props)
    screen.getByRole('button', { name: 'List View' })
    screen.getByRole('button', { name: 'Map View' })
  })

  it('should render Proceed to labware setup CTA that is enabled', () => {
    render(props)
    const button = screen.getByRole('button', {
      name: 'Proceed to labware position check',
    })
    expect(button).toBeEnabled()
  })

  it('should render a disabled Proceed to labware setup CTA if the protocol requests modules and they are not all attached to the robot', () => {
    when(useUnmatchedModulesForProtocol)
      .calledWith(MOCK_ROBOT_NAME, MOCK_RUN_ID)
      .thenReturn({
        missingModuleIds: ['foo'],
        remainingAttachedModules: [mockTemperatureModule],
      })
    render(props)
    const button = screen.getByRole('button', {
      name: 'Proceed to labware position check',
    })
    expect(button).toBeDisabled()
  })

  it('should render a disabled Proceed to labware setup CTA if the protocol requests modules they are not all calibrated', () => {
    when(useModuleCalibrationStatus)
      .calledWith(MOCK_ROBOT_NAME, MOCK_RUN_ID)
      .thenReturn({ complete: false })
    render(props)
    const button = screen.getByRole('button', {
      name: 'Proceed to labware position check',
    })
    expect(button).toBeDisabled()
  })

  it('should render the SetupModulesList component when clicking List View', () => {
    render(props)
    const button = screen.getByRole('button', { name: 'List View' })
    fireEvent.click(button)
    screen.getByText('Mock setup modules list')
  })

  it('should render the SetupModulesList and SetupFixtureList component when clicking List View for Flex', () => {
    when(useIsFlex).calledWith(MOCK_ROBOT_NAME).thenReturn(true)
    vi.mocked(getRequiredDeckConfig).mockReturnValue([
      {
        cutoutId: 'cutoutA1',
        cutoutFixtureId: 'trashBinAdapter',
        requiredAddressableAreas: ['movableTrashA1'],
        compatibleCutoutFixtureIds: ['trashBinAdapter'],
        missingLabwareDisplayName: null,
      },
    ])
    render(props)
    const button = screen.getByRole('button', { name: 'List View' })
    fireEvent.click(button)
    screen.getByText('Mock setup modules list')
    screen.getByText('Mock setup fixture list')
  })

  it('should not render the SetupFixtureList component when there are no required fixtures', () => {
    when(useIsFlex).calledWith(MOCK_ROBOT_NAME).thenReturn(true)
    render(props)
    const button = screen.getByRole('button', { name: 'List View' })
    fireEvent.click(button)
    screen.getByText('Mock setup modules list')
    expect(screen.queryByText('Mock setup fixture list')).toBeNull()
  })

  it('should render the SetupModulesMap component when clicking Map View', () => {
    render(props)
    const button = screen.getByRole('button', { name: 'Map View' })
    fireEvent.click(button)
    screen.getByText('Mock setup modules map')
  })

  it('should render disabled button when deck config is not configured or there is a conflict', () => {
    vi.mocked(getIsFixtureMismatch).mockReturnValue(true)
    render(props)
    const button = screen.getByRole('button', {
      name: 'Proceed to labware position check',
    })
    expect(button).toBeDisabled()
  })
})
