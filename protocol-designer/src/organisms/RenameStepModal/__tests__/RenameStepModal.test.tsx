import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { PAUSE_UNTIL_RESUME } from '../../../constants'
import { renameStep } from '../../../labware-ingred/actions'
import { RenameStepModal } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../labware-ingred/actions')

const render = (props: ComponentProps<typeof RenameStepModal>) => {
  return renderWithProviders(<RenameStepModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('EditNickNameModal', () => {
  let props: ComponentProps<typeof RenameStepModal>

  beforeEach(() => {
    props = {
      onClose: vi.fn(),
      formData: {
        stepType: 'pause',
        id: 'test_id',
        pauseAction: PAUSE_UNTIL_RESUME,
        description: 'some description',
        pauseMessage: 'some message',
        stepName: 'pause',
        stepDetails: '',
      },
    }
  })
  it('renders the text and add a step name and a step notes', () => {
    render(props)
    screen.getByText('Name step')
    screen.getByText('Step Name')
    screen.getByText('Step Notes')

    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onClose).toHaveBeenCalled()

    const stepName = screen.getAllByRole('textbox', { name: '' })[0]
    fireEvent.change(stepName, { target: { value: 'mockStepName' } })

    const stepDetails = screen.getAllByRole('textbox', { name: '' })[1]
    fireEvent.change(stepDetails, { target: { value: 'mockStepDetails' } })

    fireEvent.click(screen.getByText('Save'))
    expect(vi.mocked(renameStep)).toHaveBeenCalled()
    expect(props.onClose).toHaveBeenCalled()
  })
  it('renders the too long step name error', () => {
    render(props)
    const stepName = screen.getAllByRole('textbox', { name: '' })[0]
    fireEvent.change(stepName, {
      target: {
        value:
          'mockStepNameisthelongeststepnameihaveeverseen mockstepNameisthelongeststepnameihaveeverseen mockstepNameisthelongest',
      },
    })
    screen.getByText('Oops! Your step name is too long.')
  })
})
