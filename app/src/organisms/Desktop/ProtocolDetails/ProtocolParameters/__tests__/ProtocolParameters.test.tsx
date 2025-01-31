import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ProtocolParameters } from '..'

import type { ComponentProps } from 'react'
import type { RunTimeParameter } from '@opentrons/shared-data'
import type * as Components from '@opentrons/components'

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof Components>()
  return {
    ...actual,
    InfoScreen: vi.fn(() => <div>mock InfoScreen</div>),
  }
})

const mockRunTimeParameter: RunTimeParameter[] = [
  {
    displayName: 'Trash Tips',
    variableName: 'TIP_TRASH',
    description:
      'to throw tip into the trash or to not throw tip into the trash',
    type: 'bool',
    default: true,
    value: true,
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
  {
    displayName: 'pipette mount',
    variableName: 'mont',
    description: 'pipette mount',
    type: 'str',
    value: 'left',
    choices: [
      {
        displayName: 'Left',
        value: 'left',
      },
      {
        displayName: 'Right',
        value: 'right',
      },
    ],
    default: 'left',
  },
]

const render = (props: ComponentProps<typeof ProtocolParameters>) => {
  return renderWithProviders(<ProtocolParameters {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ProtocolParameters', () => {
  let props: ComponentProps<typeof ProtocolParameters>

  beforeEach(() => {
    props = {
      runTimeParameters: mockRunTimeParameter,
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render banner when RunTimeParameters are existing', () => {
    render(props)
    screen.getByText('Listed values are view-only')
    screen.getByText('Start setup to customize values')
  })

  it('should render table header', () => {
    render(props)
    screen.getByText('Name')
    screen.getByText('Default Value')
    screen.getByText('Range')
  })

  it('should render parameters default information', () => {
    render(props)
    screen.getByText('Trash Tips')
    screen.getByText('On')
    screen.getByText('On, off')

    screen.getByText('EtoH Volume')
    screen.getByText('6.5 mL')
    screen.getByText('1.5-10.0')

    screen.getByText('Default Module Offsets')
    screen.getByText('No offsets')
    screen.getByText('3 options')

    screen.getByText('pipette mount')
    screen.getByText('Left')
    screen.getByText('Left, Right')
  })

  it('should render InfoScreen component when protocol does not have any parameter', () => {
    props = {
      runTimeParameters: [],
    }
    render(props)
    screen.getByText('mock InfoScreen')
  })
})
