import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { setFeatureFlags } from '../../../feature-flags/actions'
import { IncompatibleTipsModal } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../feature-flags/actions')

const render = (props: ComponentProps<typeof IncompatibleTipsModal>) => {
  return renderWithProviders(<IncompatibleTipsModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('IncompatibleTipsModal', () => {
  let props: ComponentProps<typeof IncompatibleTipsModal>

  beforeEach(() => {
    props = {
      onClose: vi.fn(),
    }
  })
  it('renders the text and ctas', () => {
    render(props)
    screen.getByText('Incompatible tips')
    screen.getByText(
      'Using a pipette with an incompatible tip rack may result reduce pipette accuracy and collisions. We strongly recommend that you do not pair a pipette with an incompatible tip rack.'
    )
    fireEvent.click(screen.getByText('Show more tip types'))
    expect(vi.mocked(setFeatureFlags)).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onClose).toHaveBeenCalled()
  })
})
