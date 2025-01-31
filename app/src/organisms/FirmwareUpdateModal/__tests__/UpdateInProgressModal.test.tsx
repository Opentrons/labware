import { describe, it, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { UpdateInProgressModal } from '../UpdateInProgressModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof UpdateInProgressModal>) => {
  return renderWithProviders(<UpdateInProgressModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UpdateInProgressModal', () => {
  let props: ComponentProps<typeof UpdateInProgressModal>
  beforeEach(() => {
    props = {
      subsystem: 'pipette_right',
    }
  })
  it('renders pipette text', () => {
    render(props)
    screen.getByText('Updating pipette firmware...')
  })
  it('renders Hepa/UV text', () => {
    props = {
      subsystem: 'hepa_uv',
    }
    render(props)
    screen.getByText('Updating HEPA/UV Module firmware...')
  })
})
