import { it, describe, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { ChosenTipRackRender } from '../ChosenTipRackRender'

import type { ComponentProps } from 'react'
import type { SelectOption } from '/app/atoms/SelectField/Select'

const render = (props: ComponentProps<typeof ChosenTipRackRender>) => {
  return renderWithProviders(<ChosenTipRackRender {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockSelectValue = {
  value: 'opentrons_96_tiprack_1000ul',
  label: 'Opentrons 96 tip rack 1000ul',
} as SelectOption

describe('ChosenTipRackRender', () => {
  let props: ComponentProps<typeof ChosenTipRackRender>
  beforeEach(() => {
    props = {
      selectedValue: mockSelectValue,
    }
  })

  it('renders text and image alt text when tip rack is Opentrons 96 1000uL', () => {
    render(props)
    screen.getByText('Opentrons 96 tip rack 1000ul')
    screen.getByAltText('Opentrons 96 tip rack 1000ul image')
  })
})
