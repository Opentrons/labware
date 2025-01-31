import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { SelectFixtures } from '../SelectFixtures'

import type { ComponentProps } from 'react'
import type { WizardFormState, WizardTileProps } from '../types'

const render = (props: ComponentProps<typeof SelectFixtures>) => {
  return renderWithProviders(<SelectFixtures {...props} />, {
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

describe('SelectFixtures', () => {
  let props: ComponentProps<typeof SelectFixtures>

  beforeEach(() => {
    props = {
      ...props,
      ...mockWizardTileProps,
    } as WizardTileProps
  })

  it('renders the trash bin by default and all the default text', () => {
    render(props)
    screen.getByText('Step 5')
    screen.getByText('Add your fixtures')
    screen.getByText(
      'Fixtures replace standard deck slots and let you add functionality to your Flex.'
    )
    screen.getByText('Staging area')
    screen.getByText('Waste Chute')
    screen.getByText('Which fixtures will you be using?')
    screen.getByText('Fixtures added')
    screen.getByText('Trash Bin')
  })
  it('calls setValue when clicking to add a fixture', () => {
    render(props)
    fireEvent.click(screen.getByText('Staging area'))
    expect(props.setValue).toHaveBeenCalled()
  })
  it('calls goBack when clicking on go back', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(props.goBack).toHaveBeenCalled()
  })
})
