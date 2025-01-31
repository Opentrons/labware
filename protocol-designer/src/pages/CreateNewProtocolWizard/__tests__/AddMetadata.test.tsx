import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { AddMetadata } from '../AddMetadata'

import type { ComponentProps } from 'react'
import type { WizardFormState, WizardTileProps } from '../types'

const render = (props: ComponentProps<typeof AddMetadata>) => {
  return renderWithProviders(<AddMetadata {...props} />, {
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
  register: vi.fn() as any,
}

describe('AddMetadata', () => {
  let props: ComponentProps<typeof AddMetadata>

  beforeEach(() => {
    props = {
      ...props,
      ...mockWizardTileProps,
      analyticsStartTime: new Date('2024-01-01T00:00:00Z'),
    }
  })

  it('renders all the text and fields', () => {
    render(props)
    screen.getByText('Step 6')
    screen.getByText('Tell us about your protocol')
    screen.getByText('Name')
    screen.getByText('Description')
    screen.getByText('Author/Organization')
    let input = screen.getAllByRole('textbox', { name: '' })[1]
    fireEvent.change(input, { target: { value: 'mockProtocolName' } })
    expect(props.register).toHaveBeenCalled()
    input = screen.getAllByRole('textbox', { name: '' })[2]
    fireEvent.change(input, { target: { value: 'mock org' } })
    expect(props.register).toHaveBeenCalled()
  })
})
