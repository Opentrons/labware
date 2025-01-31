import { MemoryRouter } from 'react-router-dom'
import { screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  SINGLE_RIGHT_SLOT_FIXTURE,
  STAGING_AREA_RIGHT_SLOT_FIXTURE,
  TRASH_BIN_ADAPTER_FIXTURE,
  ot3StandardDeckV5,
} from '@opentrons/shared-data'
import {
  useModulesQuery,
  useUpdateDeckConfigurationMutation,
} from '@opentrons/react-api-client'

import { i18n } from '/app/i18n'
import { mockHeaterShaker } from '/app/redux/modules/__fixtures__'
import { useCloseCurrentRun } from '/app/resources/runs'
import { LocationConflictModal } from '../LocationConflictModal'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type { ComponentProps } from 'react'
import type { UseQueryResult } from 'react-query'
import type { DeckConfiguration } from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/deck_configuration')
vi.mock('/app/resources/runs')

const mockFixture = {
  cutoutId: 'cutoutB3',
  cutoutFixtureId: STAGING_AREA_RIGHT_SLOT_FIXTURE,
}

const render = (props: ComponentProps<typeof LocationConflictModal>) => {
  return renderWithProviders(
    <MemoryRouter>
      <LocationConflictModal {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('LocationConflictModal', () => {
  let props: ComponentProps<typeof LocationConflictModal>
  const mockUpdate = vi.fn()
  beforeEach(() => {
    props = {
      onCloseClick: vi.fn(),
      cutoutId: 'cutoutB3',
      requiredFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
      deckDef: ot3StandardDeckV5 as any,
      robotName: 'otie',
    }
    vi.mocked(useCloseCurrentRun).mockReturnValue({
      closeCurrentRun: vi.fn(),
    } as any)
    vi.mocked(useModulesQuery).mockReturnValue({ data: { data: [] } } as any)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [mockFixture],
    } as UseQueryResult<DeckConfiguration>)
    vi.mocked(useUpdateDeckConfigurationMutation).mockReturnValue({
      updateDeckConfiguration: mockUpdate,
    } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should render the modal information for a fixture conflict', () => {
    render(props)
    screen.getByText('Deck location conflict')
    screen.getByText('Slot B3')
    screen.getByText('Protocol specifies')
    screen.getByText('Currently configured')
    screen.getAllByText('Staging area slot')
    screen.getByText('Trash bin')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onCloseClick).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Update deck' }))
    expect(mockUpdate).toHaveBeenCalled()
  })
  it('should render the modal information for a module fixture conflict', () => {
    vi.mocked(useModulesQuery).mockReturnValue({
      data: { data: [mockHeaterShaker] },
    } as any)
    props = {
      onCloseClick: vi.fn(),
      cutoutId: 'cutoutB3',
      requiredModule: 'heaterShakerModuleV1',
      deckDef: ot3StandardDeckV5 as any,
      robotName: 'otie',
    }
    render(props)
    screen.getByText('Protocol specifies')
    screen.getByText('Currently configured')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onCloseClick).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Update deck' }))
    screen.getByText('Heater-Shaker Module GEN1 in USB-1')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(mockUpdate).toHaveBeenCalled()
  })
  it('should render the modal information for a single slot fixture conflict', () => {
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [
        {
          cutoutId: 'cutoutB1',
          cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
        },
      ],
    } as UseQueryResult<DeckConfiguration>)
    props = {
      onCloseClick: vi.fn(),
      cutoutId: 'cutoutB1',
      requiredFixtureId: SINGLE_RIGHT_SLOT_FIXTURE,
      missingLabwareDisplayName: 'a tiprack',
      deckDef: ot3StandardDeckV5 as any,
      robotName: 'otie',
    }
    render(props)
    screen.getByText('Deck location conflict')
    screen.getByText('Slot B1')
    screen.getByText('Protocol specifies')
    screen.getByText('Currently configured')
    screen.getAllByText('Trash bin')
    screen.getByText('a tiprack')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onCloseClick).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Update deck' }))
    expect(mockUpdate).toHaveBeenCalled()
  })
  it('should render correct info for a odd', () => {
    props = {
      ...props,
      isOnDevice: true,
    }
    render(props)
    screen.getByText('Deck location conflict')
    screen.getByText('Slot B3')
    screen.getByText('Protocol specifies')
    screen.getByText('Currently configured')
    screen.getAllByText('Staging area slot')
    screen.getByText('Trash bin')
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onCloseClick).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Update deck'))
    expect(mockUpdate).toHaveBeenCalled()
  })
})
