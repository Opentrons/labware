import { screen } from '@testing-library/react'
import { describe, it, beforeEach, vi } from 'vitest'
import { i18n } from '/app/i18n'
import { getIsOnDevice } from '/app/redux/config'
import { renderWithProviders } from '/app/__testing-utils__'
import { InProgressModal } from '../InProgressModal'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof InProgressModal>) => {
  return renderWithProviders(<InProgressModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}
describe('InProgressModal', () => {
  let props: ComponentProps<typeof InProgressModal>
  beforeEach(() => {
    vi.mocked(getIsOnDevice).mockReturnValue(false)
  })
  it('renders the correct text with no child', () => {
    render(props)
    screen.getByLabelText('spinner')
  })
  it('renders the correct info for on device', () => {
    render(props)
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    screen.getByLabelText('spinner')
  })
  it('renders the correct text with child', () => {
    props = {
      children: <div>Moving gantry...</div>,
    }
    render(props)
    screen.getByText('Moving gantry...')
    screen.getByLabelText('spinner')
  })
  it('renders the correct info when spinner is overriden', () => {
    props = {
      alternativeSpinner: <div>alternative spinner</div>,
    }
    render(props)
    screen.getByText('alternative spinner')
  })
})
