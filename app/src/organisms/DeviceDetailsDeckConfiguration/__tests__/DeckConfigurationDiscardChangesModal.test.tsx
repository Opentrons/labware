import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { DeckConfigurationDiscardChangesModal } from '../DeckConfigurationDiscardChangesModal'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockFunc = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = (
  props: ComponentProps<typeof DeckConfigurationDiscardChangesModal>
) => {
  return renderWithProviders(
    <DeckConfigurationDiscardChangesModal {...props} />,
    {
      i18nInstance: i18n,
    }
  )
}

describe('DeckConfigurationDiscardChangesModal', () => {
  let props: ComponentProps<typeof DeckConfigurationDiscardChangesModal>

  beforeEach(() => {
    props = {
      setShowConfirmationModal: mockFunc,
    }
  })
  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Changes will be lost')
    screen.getByText(
      'Are you sure you want to exit without saving your deck configuration?'
    )
    screen.getByText('Discard changes')
    screen.getByText('Continue editing')
  })

  it('should call a mock function when tapping discard changes button', () => {
    render(props)
    fireEvent.click(screen.getByText('Discard changes'))
    expect(mockFunc).toHaveBeenCalledWith(false)
    expect(mockNavigate).toHaveBeenCalled()
  })

  it('should call a mock function when tapping continue editing button', () => {
    render(props)
    fireEvent.click(screen.getByText('Continue editing'))
    expect(mockFunc).toHaveBeenCalledWith(false)
  })
})
