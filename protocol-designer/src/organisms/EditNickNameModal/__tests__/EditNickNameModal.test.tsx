import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { EditNickNameModal } from '..'
import { getLabwareNicknamesById } from '../../../ui/labware/selectors'
import { renameLabware } from '../../../labware-ingred/actions'

import type { ComponentProps } from 'react'

vi.mock('../../../ui/labware/selectors')
vi.mock('../../../labware-ingred/actions')

const render = (props: ComponentProps<typeof EditNickNameModal>) => {
  return renderWithProviders(<EditNickNameModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('EditNickNameModal', () => {
  let props: ComponentProps<typeof EditNickNameModal>

  beforeEach(() => {
    props = {
      onClose: vi.fn(),
      labwareId: 'mockId',
    }
    vi.mocked(getLabwareNicknamesById).mockReturnValue({
      mockId: 'mockOriginalName',
    })
  })
  it('renders the text and adds a nickname', () => {
    render(props)
    screen.getByText('Rename labware')
    screen.getByText('Labware name')

    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onClose).toHaveBeenCalled()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'mockNickName' } })
    fireEvent.click(screen.getByText('Save'))
    expect(vi.mocked(renameLabware)).toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalled()
  })
  it('renders the too long nickname error', () => {
    render(props)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, {
      target: {
        value:
          'mockNickNameisthelongestnicknameihaveeverseen mockNickNameisthelongestnicknameihaveeverseen mockNickNameisthelongest',
      },
    })
    screen.getByText('Labware names must be 115 characters or fewer.')
  })
})
