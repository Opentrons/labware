import { renderWithProviders } from '../../../testing/utils'
import { describe, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { ParametersTable } from '../index'

import type { ComponentProps } from 'react'
import type { RunTimeParameter } from '@opentrons/shared-data'

const tMock = (key: string) => key
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

const render = (props: ComponentProps<typeof ParametersTable>) => {
  return renderWithProviders(<ParametersTable {...props} />)
}

describe('ParametersTable', () => {
  let props: ComponentProps<typeof ParametersTable>

  beforeEach(() => {
    props = {
      runTimeParameters: mockRunTimeParameter,
    }
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

    // more than 2 options
    screen.getByText('Default Module Offsets')
    screen.getByText('No offsets')
    screen.getByText('3 options')

    // 2 options
    screen.getByText('pipette mount')
    screen.getByText('Left')
    screen.getByText('Left, Right')
  })

  it('should render the raw i18n values if a t prop is provided', () => {
    props.t = tMock
    render(props)
    screen.getByText('name')
    screen.getByText('default_value')
    screen.getByText('range')
  })

  it('should render a description icon if description is provided', () => {
    render(props)
    screen.getByTestId('Icon_0')
  })
})
