import { vi, it, describe, expect, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { when } from 'vitest-when'
import { Route, MemoryRouter, Routes } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { deleteProtocol, deleteRun, getProtocol } from '@opentrons/api-client'
import {
  useCreateRunMutation,
  useHost,
  useProtocolQuery,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { useHardwareStatusText } from '/app/organisms/ODD/RobotDashboard/hooks'
import { useOffsetCandidatesForAnalysis } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/useOffsetCandidatesForAnalysis'
import { useRunTimeParameters } from '/app/resources/protocols'
import { ProtocolSetupParameters } from '/app/organisms/ODD/ProtocolSetup/ProtocolSetupParameters'
import { mockRunTimeParameterData } from '/app/organisms/ODD/ProtocolSetup/__fixtures__'
import { formatTimeWithUtcLabel } from '/app/resources/runs'
import { useMissingProtocolHardware } from '/app/transformations/commands'
import { ProtocolDetails } from '..'
import { Deck } from '../Deck'
import { Hardware } from '../Hardware'
import { Labware } from '../Labware'
import { Parameters } from '../Parameters'
import { useScrollPosition } from '/app/local-resources/dom-utils'

import type { HostConfig } from '@opentrons/api-client'

vi.mock(
  '/app/organisms/ODD/ProtocolSetup/ProtocolSetupParameters/ProtocolSetupParameters'
)
vi.mock('@opentrons/api-client')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/organisms/ODD/RobotDashboard/hooks')
vi.mock(
  '/app/organisms/LegacyApplyHistoricOffsets/hooks/useOffsetCandidatesForAnalysis'
)
vi.mock('/app/resources/protocols')
vi.mock('/app/transformations/commands')
vi.mock('../Deck')
vi.mock('../Hardware')
vi.mock('../Labware')
vi.mock('../Parameters')
vi.mock('/app/redux/config')
vi.mock('/app/local-resources/dom-utils')

const MOCK_HOST_CONFIG = {} as HostConfig
const mockCreateRun = vi.fn((id: string) => {})
const MOCK_DATA = {
  data: {
    id: 'mockProtocol1',
    createdAt: '2022-05-03T21:36:12.494778+00:00',
    protocolType: 'json',
    metadata: {
      protocolName:
        'Nextera XT DNA Library Prep Kit Protocol: Part 1/4 - Tagment Genomic DNA and Amplify Libraries',
      author: 'engineering testing division',
      description: 'A short mock protocol',
      created: 1606853851893,
      tags: ['unitTest'],
    },
    analysisSummaries: [],
    files: [],
    key: '26ed5a82-502f-4074-8981-57cdda1d066d',
  },
}

const render = (path = '/protocols/fakeProtocolId') => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]} initialIndex={0}>
      <Routes>
        <Route path="/protocols/:protocolId" element={<ProtocolDetails />} />
      </Routes>
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ODDProtocolDetails', () => {
  beforeEach(() => {
    when(useRunTimeParameters).calledWith('fakeProtocolId').thenReturn([])
    vi.mocked(useCreateRunMutation).mockReturnValue({
      createRun: mockCreateRun,
    } as any)
    vi.mocked(useHardwareStatusText).mockReturnValue(
      'mock missing hardware chip text'
    )
    vi.mocked(useOffsetCandidatesForAnalysis).mockReturnValue([])
    vi.mocked(useMissingProtocolHardware).mockReturnValue({
      missingProtocolHardware: [],
      isLoading: false,
      conflictedSlots: [],
    })
    vi.mocked(useProtocolQuery).mockReturnValue({
      data: MOCK_DATA,
      isLoading: false,
    } as any)
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: {
        id: 'mockAnalysisId',
        status: 'completed',
      },
    } as any)
    when(vi.mocked(useHost)).calledWith().thenReturn(MOCK_HOST_CONFIG)
    vi.mocked(getProtocol).mockResolvedValue({
      data: { links: { referencingRuns: [{ id: '1' }, { id: '2' }] } },
    } as any)
    vi.mocked(useScrollPosition).mockReturnValue({
      isScrolled: false,
      scrollRef: {} as any,
    })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders protocol truncated name that expands when clicked', () => {
    render()
    const name = screen.getByText(
      'Nextera XT DNA Library Prep Kit Protocol: Part 1/4 - Tagment...Amplify Libraries'
    )
    fireEvent.click(name)
    screen.getByText(
      'Nextera XT DNA Library Prep Kit Protocol: Part 1/4 - Tagment Genomic DNA and Amplify Libraries'
    )
  })

  it('renders the start setup button', () => {
    render()
    screen.getByText('Start setup')
  })

  it('renders the protocol author', () => {
    render()
    screen.getByText('engineering testing division')
  })

  it('renders the protocol description', () => {
    render()
    screen.getByText('A short mock protocol')
  })

  it('renders the protocol date added', () => {
    render()
    screen.getByText(
      `Date Added: ${formatTimeWithUtcLabel(
        '2022-05-03T21:36:12.494778+00:00'
      )}`
    )
  })

  it('renders the pin protocol button', () => {
    render()
    screen.getByText('Pin protocol')
  })

  it('renders the delete protocol button', async () => {
    when(vi.mocked(getProtocol))
      .calledWith(MOCK_HOST_CONFIG, 'fakeProtocolId')
      .thenResolve({
        data: { links: { referencingRuns: [{ id: '1' }, { id: '2' }] } },
      } as any)
    render()
    const deleteButton = screen.getByRole('button', { name: 'Delete protocol' })
    fireEvent.click(deleteButton)
    const confirmDeleteButton = screen.getByText('Delete')
    fireEvent.click(confirmDeleteButton)
    await waitFor(() =>
      expect(vi.mocked(deleteRun)).toHaveBeenCalledWith(MOCK_HOST_CONFIG, '1')
    )
    await waitFor(() =>
      expect(vi.mocked(deleteRun)).toHaveBeenCalledWith(MOCK_HOST_CONFIG, '2')
    )
    await waitFor(() =>
      expect(vi.mocked(deleteProtocol)).toHaveBeenCalledWith(
        MOCK_HOST_CONFIG,
        'fakeProtocolId'
      )
    )
  })

  it('renders the navigation buttons', () => {
    vi.mocked(Hardware).mockReturnValue(<div>Mock Hardware</div>)
    vi.mocked(Labware).mockReturnValue(<div>Mock Labware</div>)
    vi.mocked(Deck).mockReturnValue(<div>Mock Initial Deck Layout</div>)
    vi.mocked(Parameters).mockReturnValue(<div>Mock Parameters</div>)

    render()
    const parametersButton = screen.getByRole('button', { name: 'Parameters' })
    fireEvent.click(parametersButton)
    const hardwareButton = screen.getByRole('button', { name: 'Hardware' })
    fireEvent.click(hardwareButton)
    screen.getByText('Mock Hardware')
    const labwareButton = screen.getByRole('button', { name: 'Labware' })
    fireEvent.click(labwareButton)
    screen.getByText('Mock Labware')
    // Can't test this until liquids section exists
    screen.getByRole('button', { name: 'Liquids' })
    const deckButton = screen.getByRole('button', { name: 'Deck' })
    fireEvent.click(deckButton)
    screen.getByText('Mock Initial Deck Layout')
    const summaryButton = screen.getByRole('button', { name: 'Summary' })
    fireEvent.click(summaryButton)
    screen.getByText('A short mock protocol')
  })

  it('should render a loading skeleton while awaiting a response from the server', () => {
    vi.mocked(useProtocolQuery).mockReturnValue({
      data: MOCK_DATA,
      isLoading: true,
    } as any)
    render()
    expect(screen.getAllByTestId('Skeleton').length).toBeGreaterThan(0)
  })

  it('renders the parameters screen', () => {
    when(useRunTimeParameters)
      .calledWith('fakeProtocolId')
      .thenReturn(mockRunTimeParameterData)
    render()
    fireEvent.click(screen.getByText('Start setup'))
    expect(vi.mocked(ProtocolSetupParameters)).toHaveBeenCalled()
  })

  it('render chip about modules when missing a hardware', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: {
        id: 'mockAnalysisId',
        status: 'completed',
      },
    } as any)
    render()
    screen.getByText('mock missing hardware chip text')
  })

  it('render requires csv text when a csv file is required', () => {
    vi.mocked(useProtocolAnalysisAsDocumentQuery).mockReturnValue({
      data: {
        id: 'mockAnalysisId',
        status: 'completed',
        result: 'parameter-value-required',
      },
    } as any)
    render()
    screen.getByText('mock missing hardware chip text & requires CSV')
  })
})
