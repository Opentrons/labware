import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { getLabwareDefsByURI } from '../../../labware-defs/selectors'
import { getAllowAllTipracks } from '../../../feature-flags/selectors'
import { IncompatibleTipsModal } from '../../../organisms'
import { createCustomTiprackDef } from '../../../labware-defs/actions'
import { SelectPipettes } from '../SelectPipettes'
import { getTiprackOptions } from '../utils'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { WizardFormState, WizardTileProps } from '../types'

vi.mock('../../../labware-defs/selectors')
vi.mock('../../../feature-flags/selectors')
vi.mock('../../../organisms')
vi.mock('../../../labware-defs/actions')
vi.mock('../utils')
const mockLocation = vi.fn()
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useLocation: () => mockLocation,
  }
})

const render = (props: ComponentProps<typeof SelectPipettes>) => {
  return renderWithProviders(<SelectPipettes {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const values = {
  additionalEquipment: [],
  fields: {
    name: '',
    description: '',
    organizationOrAuthor: '',
    robotType: FLEX_ROBOT_TYPE,
  },
  pipettesByMount: { left: {}, right: {} },
  modules: null,
} as WizardFormState

const mockWizardTileProps: Partial<WizardTileProps> = {
  proceed: vi.fn(),
  setValue: vi.fn(),
  watch: vi.fn((name: keyof typeof values) => values[name]) as any,
}

describe('SelectPipettes', () => {
  let props: ComponentProps<typeof SelectPipettes>

  beforeEach(() => {
    props = {
      ...props,
      goBack: vi.fn(),
      ...mockWizardTileProps,
    } as WizardTileProps
    vi.mocked(IncompatibleTipsModal).mockReturnValue(
      <div>mock incompatible tips modal</div>
    )
    vi.mocked(getLabwareDefsByURI).mockReturnValue({})
    vi.mocked(getAllowAllTipracks).mockReturnValue(false)
    vi.mocked(getTiprackOptions).mockReturnValue({
      'opentrons/opentrons_flex_96_tiprack_200ul/1': '200µL Flex tipracks',
      'opentrons/opentrons_flex_96_tiprack_1000ul/1': '1000µL Flex tipracks',
    })
  })

  it('renders the first page of select pipettes for a Flex', () => {
    render(props)
    screen.getByText('Step 2')
    screen.getByText('Add a pipette')
    screen.getByText(
      'Pick your first pipette. If you need a second pipette, you can add it next.'
    )
    screen.getByText('Pipette type')
    // select pip type
    fireEvent.click(screen.getByRole('label', { name: '1-Channel' }))
    screen.getByText('Pipette volume')
    // select pip volume
    fireEvent.click(screen.getByRole('label', { name: '1000 µL' }))
    // select tip
    screen.getByText('Add custom pipette tips')
    screen.getByText('200µL Flex tipracks')
    fireEvent.click(screen.getByText('1000µL Flex tipracks'))

    screen.getByRole('button', { name: 'Confirm' })

    // go back
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.goBack).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
  })

  it('renders the first page of select pipettes for an ot-2', () => {
    vi.mocked(getTiprackOptions).mockReturnValue({
      'opentrons/opentrons_96_tiprack_10ul/1': '10µL tipracks',
      'opentrons/opentrons_96_tiprack_300ul/1': '300µL tipracks',
    })

    const values = {
      additionalEquipment: [],
      fields: {
        name: '',
        description: '',
        organizationOrAuthor: '',
        robotType: OT2_ROBOT_TYPE,
      },
      pipettesByMount: { left: {}, right: {} },
      modules: null,
    } as WizardFormState

    props = {
      ...props,
      watch: vi.fn((name: keyof typeof values) => values[name]) as any,
    }
    render(props)
    screen.getByText('Step 2')
    screen.getByText('Add a pipette')
    screen.getByText(
      'Pick your first pipette. If you need a second pipette, you can add it next.'
    )
    screen.getByText('Pipette type')
    // select pip type
    fireEvent.click(screen.getByRole('label', { name: '1-Channel' }))

    screen.getByText('Pipette generation')
    // select gen
    fireEvent.click(screen.getByRole('label', { name: 'GEN2' }))

    screen.getByText('Pipette volume')
    // select pip volume
    fireEvent.click(screen.getByRole('label', { name: '20 µL' }))
    // select tip
    screen.getByText('Add custom pipette tips')
    screen.getByText('10µL tipracks')
    fireEvent.click(screen.getByText('300µL tipracks'))
    screen.getByText('Add custom pipette tips')

    //  add custom pipette tips
    fireEvent.change(screen.getByTestId('SelectPipettes_customTipInput'))
    expect(vi.mocked(createCustomTiprackDef)).toHaveBeenCalled()

    //  change all tip setting
    fireEvent.click(screen.getByText('Show more tip types'))
    screen.getByText('mock incompatible tips modal')
  })
})
