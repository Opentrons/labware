import * as React from 'react'
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { when } from 'vitest-when'

import { ProtocolRunEmptyState } from '@opentrons/components'
import { renderWithProviders } from '../../../../__testing-utils__'
import { i18n } from '../../../../i18n'
import { useMostRecentCompletedAnalysis } from '../../../LabwarePositionCheck/useMostRecentCompletedAnalysis'

import { ProtocolRunRuntimeParameters } from '../ProtocolRunRunTimeParameters'

import type {
  CompletedProtocolAnalysis,
  RunTimeParameter,
} from '@opentrons/shared-data'

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof ProtocolRunEmptyState>()
  return {
    ...actual,
    ProtocolRunEmptyState: vi.fn(),
  }
})
vi.mock('../../../LabwarePositionCheck/useMostRecentCompletedAnalysis')

const RUN_ID = 'mockId'

const mockRunTimeParameterData: RunTimeParameter[] = [
  {
    displayName: 'Dry Run',
    variableName: 'DRYRUN',
    description: 'Is this a dry or wet run? Wet is true, dry is false',
    type: 'bool',
    default: false,
    value: false,
  },
  {
    displayName: 'Columns of Samples',
    variableName: 'COLUMNS',
    description: 'How many columns do you want?',
    type: 'int',
    min: 1,
    max: 14,
    default: 4,
    value: 4,
  },
  {
    displayName: 'EtoH Volume',
    variableName: 'ETOH_VOLUME',
    description: '70% ethanol volume',
    type: 'float',
    suffix: 'mL',
    min: 1.5,
    max: 10.0,
    default: 6.5,
    value: 6.5,
  },
  {
    displayName: 'Default Module Offsets',
    variableName: 'DEFAULT_OFFSETS',
    description: 'default module offsets for temp, H-S, and none',
    type: 'str',
    value: 'none',
    choices: [
      {
        displayName: 'No offsets',
        value: 'none',
      },
      {
        displayName: 'temp offset',
        value: '1',
      },
      {
        displayName: 'heater-shaker offset',
        value: '2',
      },
    ],
    default: 'none',
  },
]

const render = (
  props: React.ComponentProps<typeof ProtocolRunRuntimeParameters>
) => {
  return renderWithProviders(<ProtocolRunRuntimeParameters {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ProtocolRunRuntimeParameters', () => {
  let props: React.ComponentProps<typeof ProtocolRunRuntimeParameters>
  beforeEach(() => {
    props = {
      runId: RUN_ID,
    }
    vi.mocked(ProtocolRunEmptyState).mockReturnValue(
      <div>mock ProtocolRunEmptyState</div>
    )
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn({
        runTimeParameters: mockRunTimeParameterData,
      } as CompletedProtocolAnalysis)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render title, and banner when RunTimeParameters are note empty and all values are default', () => {
    render(props)
    screen.getByText('Parameters')
    screen.getByText('Default values')
    screen.getByText('Values are view-only')
    screen.getByText('Cancel the run and restart setup to edit')
    screen.getByText('Name')
    screen.getByText('Value')
  })

  it('should render title, and banner when RunTimeParameters are note empty and some value is changed', () => {
    vi.mocked(useMostRecentCompletedAnalysis).mockReturnValue({
      runTimeParameters: [
        ...mockRunTimeParameterData,
        {
          displayName: 'Dry Run',
          variableName: 'DRYRUN',
          description: 'Is this a dry or wet run? Wet is true, dry is false',
          type: 'bool',
          default: false,
          value: true,
        },
      ],
    } as CompletedProtocolAnalysis)
    render(props)
    screen.getByText('Parameters')
    screen.getByText('Custom values')
    screen.getByText('Values are view-only')
    screen.getByText('Cancel the run and restart setup to edit')
    screen.getByText('Name')
    screen.getByText('Value')
  })

  it('should render RunTimeParameters when RunTimeParameters are note empty', () => {
    render(props)
    screen.getByText('Dry Run')
    screen.getByText('Off')
    screen.getByText('Columns of Samples')
    screen.getByText('4')
    screen.getByText('EtoH Volume')
    screen.getByText('6.5 mL')
    screen.getByText('Default Module Offsets')
    screen.getByText('No offsets')
  })

  it('should render mock ProtocolRunEmptyState component when RunTimeParameters are empty', () => {
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn({
        runTimeParameters: [] as RunTimeParameter[],
      } as CompletedProtocolAnalysis)
    render(props)
    screen.getByText('Parameters')
    expect(screen.queryByText('Default values')).not.toBeInTheDocument()
    screen.getByText('mock ProtocolRunEmptyState')
  })

  // ToDo Additional test will be implemented when chip component is added
  // Need to a case to test subtext default values/custom values
})
