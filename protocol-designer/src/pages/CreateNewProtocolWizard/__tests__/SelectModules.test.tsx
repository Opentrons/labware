import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { getEnableAbsorbanceReader } from '../../../feature-flags/selectors'
import { renderWithProviders } from '../../../__testing-utils__'
import { SelectModules } from '../SelectModules'

import type { ComponentProps } from 'react'
import type { WizardFormState, WizardTileProps } from '../types'

vi.mock('../../../feature-flags/selectors')

const render = (props: ComponentProps<typeof SelectModules>) => {
  return renderWithProviders(<SelectModules {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const values = {
  fields: {
    name: '',
    description: '',
    organizationOrAuthor: '',
    robotType: FLEX_ROBOT_TYPE,
  },
  additionalEquipment: ['trashBin'],
  modules: {},
  pipettesByMount: {} as any,
} as WizardFormState

const mockWizardTileProps: Partial<WizardTileProps> = {
  proceed: vi.fn(),
  setValue: vi.fn(),
  goBack: vi.fn(),
  watch: vi.fn((name: keyof typeof values) => values[name]) as any,
}

describe('SelectModules', () => {
  let props: ComponentProps<typeof SelectModules>

  beforeEach(() => {
    props = {
      ...mockWizardTileProps,
    } as WizardTileProps
    vi.mocked(getEnableAbsorbanceReader).mockReturnValue(true)
  })

  it('renders the flex options and overall text', () => {
    render(props)
    screen.getByText('Step 4')
    screen.getByText('Add your modules')
    screen.getByText('Select modules to use in your protocol.')
    screen.getByText('Temperature Module GEN2')
    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Thermocycler Module GEN2')
    screen.getByText('Magnetic Block GEN1')
  })

  it('renders the ot-2 options', () => {
    const values = {
      fields: {
        name: '',
        description: '',
        organizationOrAuthor: '',
        robotType: OT2_ROBOT_TYPE,
      },
      additionalEquipment: ['trashBin'],
      modules: {},
      pipettesByMount: {} as any,
    } as WizardFormState
    props = {
      ...props,
      watch: vi.fn((name: keyof typeof values) => values[name]) as any,
    }
    render(props)
    screen.getByText('Temperature Module GEN2')
    screen.getByText('Temperature Module GEN1')
    screen.getByText('Heater-Shaker Module GEN1')
    screen.getByText('Magnetic Module GEN2')
    screen.getByText('Magnetic Module GEN1')
    screen.getByText('Thermocycler Module GEN2')
    screen.getByText('Thermocycler Module GEN1')
  })

  it('calls setValue when clicking to add a Magnetic Block GEN1', () => {
    render(props)
    fireEvent.click(screen.getByText('Magnetic Block GEN1'))
    expect(props.setValue).toHaveBeenCalled()
  })

  it('calls goBack when clicking on go back', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.goBack).toHaveBeenCalled()
  })
})
