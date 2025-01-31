import { vi, it, describe, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { PipetteSelect } from '/app/molecules/PipetteSelect'
import { PipetteSelection } from '../PipetteSelection'

import type { ComponentProps } from 'react'

vi.mock('/app/molecules/PipetteSelect')

const render = (props: ComponentProps<typeof PipetteSelection>) => {
  return renderWithProviders(<PipetteSelection {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('PipetteSelection', () => {
  let props: ComponentProps<typeof PipetteSelection>
  beforeEach(() => {
    props = {
      pipetteName: null,
      onPipetteChange: vi.fn(),
    }
    vi.mocked(PipetteSelect).mockReturnValue(<div>mock pipette select</div>)
  })
  it('renders the text for pipette selection', () => {
    render(props)
    screen.getByText('Choose a pipette to attach')
    screen.getByText('mock pipette select')
  })
})
