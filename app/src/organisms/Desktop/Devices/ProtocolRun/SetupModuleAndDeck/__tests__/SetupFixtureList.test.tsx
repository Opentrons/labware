import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import {
  MAGNETIC_BLOCK_D3_ADDRESSABLE_AREA,
  MAGNETIC_BLOCK_V1_FIXTURE,
  SINGLE_RIGHT_SLOT_FIXTURE,
  STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
  STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
  TRASH_BIN_ADAPTER_FIXTURE,
} from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import { SetupFixtureList } from '../SetupFixtureList'
import { NotConfiguredModal } from '../NotConfiguredModal'
import { LocationConflictModal } from '/app/organisms/LocationConflictModal'
import { DeckFixtureSetupInstructionsModal } from '/app/organisms/DeviceDetailsDeckConfiguration/DeckFixtureSetupInstructionsModal'

import type { ComponentProps } from 'react'
import type { CutoutConfigAndCompatibility } from '/app/resources/deck_configuration/hooks'

vi.mock('/app/resources/deck_configuration/hooks')
vi.mock('/app/organisms/LocationConflictModal')
vi.mock('../NotConfiguredModal')
vi.mock(
  '/app/organisms/DeviceDetailsDeckConfiguration/DeckFixtureSetupInstructionsModal'
)

const mockDeckConfigCompatibility: CutoutConfigAndCompatibility[] = [
  {
    cutoutId: 'cutoutD3',
    cutoutFixtureId: STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
    requiredAddressableAreas: ['D4'],
    compatibleCutoutFixtureIds: [
      STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
    ],
    missingLabwareDisplayName: null,
  },
]

const mockNotConfiguredDeckConfigCompatibility: CutoutConfigAndCompatibility[] = [
  {
    cutoutId: 'cutoutD3',
    cutoutFixtureId: SINGLE_RIGHT_SLOT_FIXTURE,
    requiredAddressableAreas: ['D4'],
    compatibleCutoutFixtureIds: [
      STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
    ],
    missingLabwareDisplayName: null,
  },
]

const mockConflictDeckConfigCompatibility: CutoutConfigAndCompatibility[] = [
  {
    cutoutId: 'cutoutD3',
    cutoutFixtureId: TRASH_BIN_ADAPTER_FIXTURE,
    requiredAddressableAreas: ['D4'],
    compatibleCutoutFixtureIds: [
      STAGING_AREA_SLOT_WITH_WASTE_CHUTE_RIGHT_ADAPTER_NO_COVER_FIXTURE,
    ],
    missingLabwareDisplayName: null,
  },
]

const render = (props: ComponentProps<typeof SetupFixtureList>) => {
  return renderWithProviders(<SetupFixtureList {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SetupFixtureList', () => {
  let props: ComponentProps<typeof SetupFixtureList>
  beforeEach(() => {
    props = {
      deckConfigCompatibility: mockDeckConfigCompatibility,
      robotName: 'otie',
    }
    vi.mocked(LocationConflictModal).mockReturnValue(
      <div>mock location conflict modal</div>
    )
    vi.mocked(NotConfiguredModal).mockReturnValue(
      <div>mock not configured modal</div>
    )
    vi.mocked(DeckFixtureSetupInstructionsModal).mockReturnValue(
      <div>mock DeckFixtureSetupInstructionsModal</div>
    )
  })

  it('should a fixture with configured status', () => {
    render(props)
    screen.getByText('Waste chute with staging area slot')
    screen.getByRole('button', { name: 'View setup instructions' })
    screen.getByText('D3')
    screen.getByText('Configured')
  })

  it('should render the mock setup instructions modal, when clicking view setup instructions', () => {
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'View setup instructions' })
    )
    screen.getByText('mock DeckFixtureSetupInstructionsModal')
  })

  it('should render the headers and a fixture with conflicted status', () => {
    props = {
      deckConfigCompatibility: mockConflictDeckConfigCompatibility,
      robotName: 'otie',
    }
    render(props)
    screen.getByText('Location conflict')
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    screen.getByText('mock location conflict modal')
  })

  it('should render the headers and a fixture with not configured status and button', () => {
    props = {
      deckConfigCompatibility: mockNotConfiguredDeckConfigCompatibility,
      robotName: 'otie',
    }
    render(props)
    screen.getByText('Not configured')
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    screen.getByText('mock not configured modal')
  })
  it('should render a magnetic block with a conflicted fixture', () => {
    props = {
      deckConfigCompatibility: [
        {
          cutoutId: 'cutoutD3',
          cutoutFixtureId: MAGNETIC_BLOCK_V1_FIXTURE,
          requiredAddressableAreas: [MAGNETIC_BLOCK_D3_ADDRESSABLE_AREA, 'D4'],
          compatibleCutoutFixtureIds: [
            STAGING_AREA_SLOT_WITH_MAGNETIC_BLOCK_V1_FIXTURE,
          ],
          missingLabwareDisplayName: null,
        },
      ],
      robotName: 'otie',
    }
    render(props)
    screen.getByText('Location conflict')
    screen.getByText('Magnetic Block GEN1 with staging area slot')
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }))
    screen.getByText('mock location conflict modal')
  })
})
