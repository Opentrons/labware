import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { COLORS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { CardButton } from '..'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async importOriginal => {
  const reactRouterDom = await importOriginal<NavigateFunction>()
  return {
    ...reactRouterDom,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof CardButton>) => {
  return renderWithProviders(
    <MemoryRouter>
      <CardButton {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('CardButton', () => {
  let props: ComponentProps<typeof CardButton>

  beforeEach(() => {
    props = {
      title: 'Wi-Fi',
      iconName: 'wifi',
      description: 'Find a network in your lab or enter your own.',
      destinationPath: '/mockPath',
      disabled: false,
    }
  })

  it('should render text and icon', () => {
    render(props)
    screen.getByText('Wi-Fi')
    screen.getByText('Find a network in your lab or enter your own.')
    expect(screen.getByTestId('cardButton_icon_wifi')).toBeInTheDocument()
    const button = screen.getByRole('button')
    expect(button).toHaveStyle(`background-color: ${COLORS.blue35}`)
  })

  it('renders the button as disabled', () => {
    props = {
      ...props,
      disabled: true,
    }
    render(props)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should call mock function with path when tapping a card', () => {
    render(props)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(mockNavigate).toHaveBeenCalledWith('/mockPath')
  })
})
