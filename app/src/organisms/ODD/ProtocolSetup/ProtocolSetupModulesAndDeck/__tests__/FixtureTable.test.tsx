import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'

import {
  FLEX_ROBOT_TYPE,
  MOVABLE_TRASH_D3_ADDRESSABLE_AREA,
  SINGLE_RIGHT_SLOT_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  TRASH_BIN_ADAPTER_FIXTURE,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LocationConflictModal } from '/app/organisms/LocationConflictModal'
import { useDeckConfigurationCompatibility } from '/app/resources/deck_configuration/hooks'
import { FixtureTable } from '../FixtureTable'
import { getLocalRobot } from '/app/redux/discovery'
import { mockConnectedRobot } from '/app/redux/discovery/__fixtures__'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/discovery')
vi.mock('/app/resources/deck_configuration/hooks')
vi.mock('/app/organisms/LocationConflictModal')

const mockSetSetupScreen = vi.fn()
const mockSetCutoutId = vi.fn()
const mockSetProvidedFixtureOptions = vi.fn()

const render = (props: ComponentProps<typeof FixtureTable>) => {
  return renderWithProviders(<FixtureTable {...props} />, {
    i18nInstance: i18n,
  })
}

describe('FixtureTable', () => {
  let props: ComponentProps<typeof FixtureTable>
  beforeEach(() => {
    props = {
      mostRecentAnalysis: { commands: [], labware: [] } as any,
      robotType: FLEX_ROBOT_TYPE,
      setSetupScreen: mockSetSetupScreen,
      setCutoutId: mockSetCutoutId,
      setProvidedFixtureOptions: mockSetProvidedFixtureOptions,
    }
    vi.mocked(getLocalRobot).mockReturnValue(mockConnectedRobot)
    vi.mocked(LocationConflictModal).mockReturnValue(
      <div>mock location conflict modal</div>
    )
    vi.mocked(useDeckConfigurationCompatibility).mockReturnValue([
      {
        cutoutId: 'cutoutD3',
        cutoutFixtureId: STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
        requiredAddressableAreas: ['D4'],
        compatibleCutoutFixtureIds: [
          STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
        ],
        missingLabwareDisplayName: null,
      },
    ])
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the current status - configured', () => {
    render(props)
    screen.getByText('Configured')
  })

  it('should render the current status - not configured', () => {
    vi.mocked(useDeckConfigurationCompatibility).mockReturnValue([
      {
        cutoutId: 'cutoutD3',
        cutoutFixtureId: SINGLE_RIGHT_SLOT_FIXTURE,
        requiredAddressableAreas: [MOVABLE_TRASH_D3_ADDRESSABLE_AREA],
        compatibleCutoutFixtureIds: [TRASH_BIN_ADAPTER_FIXTURE],
        missingLabwareDisplayName: null,
      },
    ])

    render(props)

    screen.getByText('Not configured')
    fireEvent.click(screen.getByText('Configure'))
    expect(mockSetCutoutId).toHaveBeenCalledWith('cutoutD3')
    expect(mockSetSetupScreen).toHaveBeenCalledWith('deck configuration')
    expect(mockSetProvidedFixtureOptions).toHaveBeenCalledWith([
      TRASH_BIN_ADAPTER_FIXTURE,
    ])
  })

  it('should render the current status - conflicting', () => {
    vi.mocked(useDeckConfigurationCompatibility).mockReturnValue([
      {
        cutoutId: 'cutoutD3',
        cutoutFixtureId: STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
        requiredAddressableAreas: [MOVABLE_TRASH_D3_ADDRESSABLE_AREA],
        compatibleCutoutFixtureIds: [TRASH_BIN_ADAPTER_FIXTURE],
        missingLabwareDisplayName: null,
      },
    ])

    render(props)

    screen.getByText('Location conflict')
    fireEvent.click(screen.getByText('Resolve'))
    screen.getByText('mock location conflict modal')
  })
})
