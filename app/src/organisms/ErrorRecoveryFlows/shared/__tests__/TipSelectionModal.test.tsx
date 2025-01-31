import { describe, it, vi, beforeEach, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { TipSelectionModal } from '../TipSelectionModal'
import { TipSelection } from '../TipSelection'

import type { ComponentProps } from 'react'

vi.mock('../TipSelection')

const render = (props: ComponentProps<typeof TipSelectionModal>) => {
  return renderWithProviders(<TipSelectionModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TipSelectionModal', () => {
  let props: ComponentProps<typeof TipSelectionModal>

  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      allowTipSelection: true,
      toggleModal: vi.fn(),
      failedLabwareUtils: {
        selectedTipLocations: { A1: null },
        areTipsSelected: true,
      } as any,
    }

    vi.mocked(TipSelection).mockReturnValue(<div>MOCK TIP SELECTION</div>)
  })

  it('renders the appropriate modal with the correct header title', () => {
    render(props)

    screen.getByText('Change tip pick-up location')
  })

  it('renders TipSelection', () => {
    render(props)

    screen.getByText('MOCK TIP SELECTION')
    screen.getByLabelText('closeIcon')
  })

  it('prevents from users from exiting the modal if no well(s) are selected', () => {
    props = {
      ...props,
      failedLabwareUtils: { areTipsSelected: false } as any,
    }

    render(props)

    expect(screen.queryByLabelText('closeIcon')).not.toBeInTheDocument()
  })
})
