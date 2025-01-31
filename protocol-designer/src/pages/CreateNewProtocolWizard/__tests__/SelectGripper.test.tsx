import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { SelectGripper } from '../SelectGripper'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { WizardFormState, WizardTileProps } from '../types'

const mockLocation = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useLocation: () => mockLocation,
  }
})

const render = (props: ComponentProps<typeof SelectGripper>) => {
  return renderWithProviders(<SelectGripper {...props} />, {
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
  pipettesByMount: {} as any,
  modules: null,
} as WizardFormState

const mockWizardTileProps: Partial<WizardTileProps> = {
  proceed: vi.fn(),
  setValue: vi.fn(),
  watch: vi.fn((name: keyof typeof values) => values[name]) as any,
}

describe('SelectGripper', () => {
  let props: ComponentProps<typeof SelectGripper>

  beforeEach(() => {
    props = {
      ...props,
      ...mockWizardTileProps,
    } as WizardTileProps
  })

  it('renders all the text and buttons for adding gripper', () => {
    render(props)
    screen.getByText('Step 3')
    screen.getByText('Add a gripper')
    screen.getByText(
      'Do you want to move labware automatically with the gripper?'
    )
    fireEvent.click(screen.getByRole('label', { name: 'Yes' }))
    expect(props.setValue).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('label', { name: 'No' }))
    expect(props.setValue).toHaveBeenCalled()
  })
})
