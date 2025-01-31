import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { SelectRobot } from '../SelectRobot'

import type { ComponentProps } from 'react'
import type { WizardFormState, WizardTileProps } from '../types'

const render = (props: ComponentProps<typeof SelectRobot>) => {
  return renderWithProviders(<SelectRobot {...props} />, {
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
} as WizardFormState

const mockWizardTileProps: Partial<WizardTileProps> = {
  proceed: vi.fn(),
  setValue: vi.fn(),
  //  @ts-expect-error: ts can't tell that its a nested key
  //  in values
  watch: vi.fn(() => values['fields.robotType']),
}

describe('SelectRobot', () => {
  let props: ComponentProps<typeof SelectRobot>

  beforeEach(() => {
    props = {
      ...props,
      ...mockWizardTileProps,
    } as WizardTileProps
  })

  it('renders all the text and clicks on Flex and ot-2 buttons', () => {
    render(props)
    screen.getByText('Step 1')
    screen.getByText('Let’s start with the basics')
    screen.getByText('What kind of robot do you have?')
    fireEvent.click(screen.getByRole('label', { name: 'Opentrons Flex' }))
    expect(props.setValue).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('label', { name: 'Opentrons OT-2' }))
    expect(props.setValue).toHaveBeenCalled()
  })
})
