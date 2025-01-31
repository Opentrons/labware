import { vi, describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'
import { COLORS } from '../../../helix-design-system'

import { ListButton } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ListButton>) =>
  renderWithProviders(<ListButton {...props} />)

describe('ListButton', () => {
  let props: ComponentProps<typeof ListButton>

  beforeEach(() => {
    props = {
      type: 'noActive',
      children: <div>mock ListButton content</div>,
      onClick: vi.fn(),
    }
  })

  it('should render correct style - noActive', () => {
    render(props)
    const listButton = screen.getByTestId('ListButton_noActive')
    expect(listButton).toHaveStyle(`backgroundColor: ${COLORS.grey30}`)
  })
  it('should render correct style - connected', () => {
    props.type = 'connected'
    render(props)
    const listButton = screen.getByTestId('ListButton_connected')
    expect(listButton).toHaveStyle(`backgroundColor: ${COLORS.green30}`)
  })
  it('should render correct style - notConnected', () => {
    props.type = 'notConnected'
    render(props)
    const listButton = screen.getByTestId('ListButton_notConnected')
    expect(listButton).toHaveStyle(`backgroundColor: ${COLORS.yellow30}`)
  })
  it('should call on click when pressed', () => {
    render(props)
    fireEvent.click(screen.getByText('mock ListButton content'))
    expect(props.onClick).toHaveBeenCalled()
  })
})
