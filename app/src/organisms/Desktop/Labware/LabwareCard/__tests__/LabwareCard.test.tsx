import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach } from 'vitest'
import { renderWithProviders, nestedTextMatcher } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useAllLabware } from '/app/local-resources/labware'
import { mockDefinition } from '/app/redux/custom-labware/__fixtures__'
import { CustomLabwareOverflowMenu } from '../CustomLabwareOverflowMenu'
import { LabwareCard } from '..'

import type { ComponentProps } from 'react'
import type * as OpentronsComponents from '@opentrons/components'

vi.mock('/app/local-resources/labware')
vi.mock('../CustomLabwareOverflowMenu')

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof OpentronsComponents>()
  return {
    ...actual,
    RobotWorkSpace: vi.fn(() => <div>mock RobotWorkSpace</div>),
  }
})

const render = (props: ComponentProps<typeof LabwareCard>) => {
  return renderWithProviders(<LabwareCard {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LabwareCard', () => {
  let props: ComponentProps<typeof LabwareCard>
  beforeEach(() => {
    vi.mocked(CustomLabwareOverflowMenu).mockReturnValue(
      <div>Mock CustomLabwareOverflowMenu</div>
    )
    vi.mocked(useAllLabware).mockReturnValue([{ definition: mockDefinition }])
    props = {
      labware: {
        definition: mockDefinition,
      },
      onClick: vi.fn(),
    }
  })

  it('renders correct info for opentrons labware card', () => {
    props.labware.definition.namespace = 'opentrons'
    render(props)
    screen.getByText('mock RobotWorkSpace')
    screen.getByText('Well Plate')
    screen.getByText('Mock Definition')
    screen.getByText(`Opentrons Definition`)
    screen.getByText('API Name')
  })

  it('renders additional info for custom labware card', () => {
    props.labware.modified = 123
    props.labware.filename = 'mock/filename'
    props.labware.definition.namespace = 'custom'
    render(props)
    screen.getByText('Custom Definition')
    screen.getByText(nestedTextMatcher('Added'))
  })
})
