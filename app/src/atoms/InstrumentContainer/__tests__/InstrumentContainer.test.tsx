import { describe, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { InstrumentContainer } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof InstrumentContainer>) => {
  return renderWithProviders(<InstrumentContainer {...props} />)[0]
}

describe('InstrumentContainer', () => {
  let props: ComponentProps<typeof InstrumentContainer>

  it('renders an instrument display name', () => {
    props = {
      displayName: 'P300 8-Channel GEN2',
    }
    render(props)
    screen.getByText('P300 8-Channel GEN2')
  })
})
