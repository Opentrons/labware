import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, afterEach } from 'vitest'

import { BaseDeck } from '@opentrons/components'
import {
  useModulesQuery,
  useUpdateDeckConfigurationMutation,
} from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { ProtocolSetupDeckConfiguration } from '..'

import type { ComponentProps } from 'react'
import type { UseQueryResult } from 'react-query'
import type {
  CompletedProtocolAnalysis,
  DeckConfiguration,
} from '@opentrons/shared-data'
import type { Modules } from '@opentrons/api-client'

vi.mock('@opentrons/components/src/hardware-sim/BaseDeck/index')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs')
vi.mock('/app/resources/deck_configuration')

const mockSetSetupScreen = vi.fn()
const PROTOCOL_DETAILS = {
  displayName: 'fake protocol',
  protocolData: ({
    commands: [],
    labware: [],
  } as unknown) as CompletedProtocolAnalysis,
  protocolKey: 'fakeProtocolKey',
  robotType: 'OT-3 Standard' as const,
}

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof BaseDeck>()
  return {
    ...actual,
    BaseDeck: vi.fn(),
  }
})

const render = (
  props: ComponentProps<typeof ProtocolSetupDeckConfiguration>
) => {
  return renderWithProviders(<ProtocolSetupDeckConfiguration {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ProtocolSetupDeckConfiguration', () => {
  let props: ComponentProps<typeof ProtocolSetupDeckConfiguration>

  beforeEach(() => {
    props = {
      cutoutId: 'cutoutD3',
      runId: 'mockRunId',
      setSetupScreen: mockSetSetupScreen,
      providedFixtureOptions: [],
    }
    vi.mocked(BaseDeck).mockReturnValue(<div>mock BaseDeck</div>)
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith('mockRunId')
      .thenReturn(PROTOCOL_DETAILS.protocolData)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue(({
      data: [],
    } as unknown) as UseQueryResult<DeckConfiguration>)
    vi.mocked(useUpdateDeckConfigurationMutation).mockReturnValue({
      updateDeckConfiguration: vi.fn(),
    } as any)
    vi.mocked(useModulesQuery).mockReturnValue(({
      data: { data: [] },
    } as unknown) as UseQueryResult<Modules>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render text, button, and DeckConfigurator', () => {
    render(props)
    screen.getByText('Deck configuration')
    screen.getByText('mock BaseDeck')
    screen.getByText('Save')
  })

  it('should call a mock function when tapping confirm button', () => {
    render(props)
    fireEvent.click(screen.getByText('Save'))
  })
})
