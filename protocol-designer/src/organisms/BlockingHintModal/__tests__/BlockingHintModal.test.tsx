import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { removeHint } from '../../../tutorial/actions'
import { BlockingHintModal } from '..'
import type { ComponentProps } from 'react'

vi.mock('../../../tutorial/actions')

const render = (props: ComponentProps<typeof BlockingHintModal>) => {
  return renderWithProviders(<BlockingHintModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('BlockingHintModal', () => {
  let props: ComponentProps<typeof BlockingHintModal>

  beforeEach(() => {
    props = {
      content: <div>mock content</div>,
      handleCancel: vi.fn(),
      handleContinue: vi.fn(),
      hintKey: 'change_magnet_module_model',
    }
  })
  it('renders the hint with buttons and checkbox', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.handleCancel).toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with export' })
    )
    expect(props.handleContinue).toHaveBeenCalled()
    expect(vi.mocked(removeHint)).toHaveBeenCalled()
    screen.getByText('mock content')
  })
})
