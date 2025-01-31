import { when } from 'vitest-when'
import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'
import {
  getLabwareDisplayName,
  fixtureTiprack300ul,
} from '@opentrons/shared-data'
import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useCurrentRun } from '/app/resources/runs'
import { getLabwareLocation } from '/app/transformations/commands'
import { LabwareInfoOverlay } from '../LabwareInfoOverlay'
import { getLabwareDefinitionUri } from '/app/transformations/protocols'
import { useLabwareOffsetForLabware } from '../useLabwareOffsetForLabware'

import type { ComponentProps } from 'react'
import type {
  LabwareDefinition2,
  ProtocolFile,
  LoadedLabware,
} from '@opentrons/shared-data'

vi.mock('/app/resources/runs')
vi.mock('/app/transformations/commands')
vi.mock('../../hooks')
vi.mock('/app/transformations/protocols')
vi.mock('../useLabwareOffsetForLabware')

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getLabwareDisplayName>()
  return {
    ...actual,
    getLabwareDisplayName: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof LabwareInfoOverlay>) => {
  return renderWithProviders(
    <svg>
      <LabwareInfoOverlay {...props} />
    </svg>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

const MOCK_LABWARE_ID = 'some_labware_id'
const MOCK_LABWARE_DEFINITION_URI = 'some_labware_definition_uri'
const MOCK_SLOT_NAME = '4'
const MOCK_LABWARE_VECTOR = { x: 1, y: 2, z: 3 }
const MOCK_RUN_ID = 'fake_run_id'

describe('LabwareInfoOverlay', () => {
  let props: ComponentProps<typeof LabwareInfoOverlay>
  let labware: LoadedLabware[]
  let labwareDefinitions: ProtocolFile<{}>['labwareDefinitions']
  beforeEach(() => {
    props = {
      definition: fixtureTiprack300ul as LabwareDefinition2,
      displayName: 'fresh tips',
      labwareId: MOCK_LABWARE_ID,
      runId: MOCK_RUN_ID,
    }
    labware = [
      {
        id: MOCK_LABWARE_ID,
        definitionUri: MOCK_LABWARE_DEFINITION_URI,
      } as LoadedLabware,
    ]
    labwareDefinitions = {
      [MOCK_LABWARE_DEFINITION_URI]: fixtureTiprack300ul as LabwareDefinition2,
    }
    when(vi.mocked(getLabwareDisplayName))
      .calledWith(props.definition)
      .thenReturn('mock definition display name')

    when(vi.mocked(useLabwareOffsetForLabware))
      .calledWith(MOCK_RUN_ID, MOCK_LABWARE_ID)
      .thenReturn({
        id: 'fake_offset_id',
        createdAt: 'fake_timestamp',
        definitionUri: 'fake_def_uri',
        location: { slotName: MOCK_SLOT_NAME },
        vector: MOCK_LABWARE_VECTOR,
      })

    when(vi.mocked(useCurrentRun))
      .calledWith()
      .thenReturn({} as any)

    when(vi.mocked(getLabwareLocation))
      .calledWith(MOCK_LABWARE_ID, [])
      .thenReturn({ slotName: MOCK_SLOT_NAME })

    when(vi.mocked(getLabwareDefinitionUri))
      .calledWith(MOCK_LABWARE_ID, labware, labwareDefinitions)
      .thenReturn(MOCK_LABWARE_DEFINITION_URI)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render the labware display name if present', () => {
    render(props)
    screen.getByText('fresh tips')
  })

  it('should render the labware def display name if no user displayName present', () => {
    render({
      ...props,
      displayName: null,
    })
    screen.getByText('mock definition display name')
  })

  it('should render NOT render the offset data label when offset data does not exist', () => {
    render(props)
    expect(screen.queryByText('Labware Offsets')).toBeNull()
  })

  it('should render the offset data when offset data exists', () => {
    when(vi.mocked(useCurrentRun))
      .calledWith()
      .thenReturn({
        data: {
          labwareOffsets: [
            {
              id: '1',
              definitionUri: MOCK_LABWARE_DEFINITION_URI,
              location: { slotName: MOCK_SLOT_NAME },
              vector: MOCK_LABWARE_VECTOR,
            },
          ],
        },
      } as any)
    render(props)
    screen.getByText('Offset Data')
    screen.getByText(nestedTextMatcher('X1.0'))
    screen.getByText(nestedTextMatcher('Y2.0'))
    screen.getByText(nestedTextMatcher('Z3.0'))
  })
})
