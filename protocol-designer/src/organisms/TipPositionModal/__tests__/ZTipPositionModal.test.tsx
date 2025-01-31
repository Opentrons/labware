import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { ZTipPositionModal } from '../ZTipPositionModal'
import { TipPositionZOnlyView } from '../TipPositionZOnlyView'

import type { ComponentProps } from 'react'

vi.mock('../TipPositionZOnlyView')
const render = (props: ComponentProps<typeof ZTipPositionModal>) => {
  return renderWithProviders(<ZTipPositionModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ZTipPositionModal', () => {
  let props: ComponentProps<typeof ZTipPositionModal>

  beforeEach(() => {
    props = {
      closeModal: vi.fn(),
      zValue: -2,
      updateValue: vi.fn(),
      wellDepthMm: 30,
      name: 'blowout_z_offset',
    }
    vi.mocked(TipPositionZOnlyView).mockReturnValue(
      <div>mock TipPositionZOnlyView</div>
    )
  })
  it('renders the text and radio buttons', () => {
    render(props)
    screen.getByText('Edit blowout position')
    screen.getByText('Change where in the well the robot performs the blowout.')
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.closeModal).toHaveBeenCalled()
    fireEvent.click(screen.getByText('Save'))
    expect(props.closeModal).toHaveBeenCalled()
    expect(props.updateValue).toHaveBeenCalled()
  })
  it('renders the custom option, caption, and visual', () => {
    render(props)
    expect(screen.getAllByRole('textbox', { name: '' })).toHaveLength(1)
    screen.getByText('between -30 and 0')
    screen.getByText('mock TipPositionZOnlyView')
  })
})
