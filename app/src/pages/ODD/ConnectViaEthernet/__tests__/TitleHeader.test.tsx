import { vi, it, describe, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { TitleHeader } from '../TitleHeader'

import type { ComponentProps } from 'react'
import type { NavigateFunction } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<NavigateFunction>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const render = (props: ComponentProps<typeof TitleHeader>) => {
  return renderWithProviders(<TitleHeader {...props} />)
}

describe('TitleHeader', () => {
  let props: ComponentProps<typeof TitleHeader>

  beforeEach(() => {
    props = {
      title: 'Ethernet',
    }
  })

  it('should render text and button', () => {
    render(props)
    screen.getByText('Ethernet')
    screen.getByTestId('Ethernet_header_back_button')
  })

  it('should call a mock function when tapping back button', () => {
    render(props)
    fireEvent.click(screen.getByTestId('Ethernet_header_back_button'))
    expect(mockNavigate).toHaveBeenCalledWith('/network-setup')
  })
})
