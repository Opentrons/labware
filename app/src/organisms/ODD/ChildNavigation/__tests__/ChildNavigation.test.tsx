import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { ChildNavigation } from '..'

import type { ComponentProps } from 'react'
import type { SmallButton } from '/app/atoms/buttons'

const render = (props: ComponentProps<typeof ChildNavigation>) =>
  renderWithProviders(<ChildNavigation {...props} />)

const mockOnClickBack = vi.fn()
const mockOnClickButton = vi.fn()
const mockOnClickSecondaryButton = vi.fn()

const mockSecondaryButtonProps: ComponentProps<typeof SmallButton> = {
  onClick: mockOnClickSecondaryButton,
  buttonText: 'Setup Instructions',
  buttonType: 'tertiaryLowLight',
  iconName: 'information',
  iconPlacement: 'startIcon',
}

describe('ChildNavigation', () => {
  let props: ComponentProps<typeof ChildNavigation>

  beforeEach(() => {
    props = {
      header: 'mock header',
      onClickBack: mockOnClickBack,
    }
  })

  it('should render text and back button', () => {
    render(props)
    screen.getByText('mock header')
    screen.getByTestId('ChildNavigation_Back_Button')
  })

  it('should call a mock function when tapping the back button', () => {
    render(props)
    fireEvent.click(screen.getByTestId('ChildNavigation_Back_Button'))
    expect(mockOnClickBack).toHaveBeenCalled()
  })

  it('should render text, back button and small button', () => {
    props = {
      ...props,
      buttonText: 'mock button',
      onClickButton: mockOnClickButton,
    }
    render(props)
    screen.getByText('mock header')
    screen.getByTestId('ChildNavigation_Back_Button')
    const mockButton = screen.getByText('mock button')
    fireEvent.click(mockButton)
    expect(mockOnClickButton).toHaveBeenCalled()
  })

  it('should render text, back button and 2 buttons', () => {
    props = {
      ...props,
      buttonText: 'mock button',
      onClickButton: mockOnClickButton,
      secondaryButtonProps: mockSecondaryButtonProps,
    }
    render(props)
    screen.getByText('mock header')
    screen.getByTestId('ChildNavigation_Back_Button')
    screen.getByText('mock button')
    const secondaryButton = screen.getByText('Setup Instructions')
    fireEvent.click(secondaryButton)
    expect(mockOnClickSecondaryButton).toHaveBeenCalled()
  })
  it.fails(
    'should not render back button if onClickBack does not exist',
    () => {
      props = {
        ...props,
        onClickBack: undefined,
      }
      render(props)
      screen.getByTestId('ChildNavigation_Back_Button')
    }
  )
  it('should render button as disabled', () => {
    props = {
      ...props,
      buttonText: 'mock button',
      onClickButton: mockOnClickButton,
      buttonIsDisabled: true,
    }
    render(props)
    const button = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(button).toBeDisabled()
  })
})
