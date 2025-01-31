import { vi, describe, it, expect, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testing/utils'
import { BORDERS, COLORS } from '../../../helix-design-system'

import { ListItem } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ListItem>) =>
  renderWithProviders(<ListItem {...props} />)

describe('ListItem', () => {
  let props: ComponentProps<typeof ListItem>

  beforeEach(() => {
    props = {
      type: 'error',
      children: <div>mock listitem content</div>,
      onClick: vi.fn(),
    }
  })

  it('should render correct style - error', () => {
    render(props)
    screen.getByText('mock listitem content')
    const listItem = screen.getByTestId('ListItem_error')
    expect(listItem).toHaveStyle(`backgroundColor: ${COLORS.red35}`)
    expect(listItem).toHaveStyle(`borderRadius: ${BORDERS.borderRadius4}`)
  })
  it('should render correct style - noActive', () => {
    props.type = 'noActive'
    render(props)
    screen.getByText('mock listitem content')
    const listItem = screen.getByTestId('ListItem_noActive')
    expect(listItem).toHaveStyle(`backgroundColor: ${COLORS.grey20}`)
    expect(listItem).toHaveStyle(`borderRadius: ${BORDERS.borderRadius4}`)
  })
  it('should render correct style - success', () => {
    props.type = 'success'
    render(props)
    screen.getByText('mock listitem content')
    const listItem = screen.getByTestId('ListItem_success')
    expect(listItem).toHaveStyle(`backgroundColor: ${COLORS.green35}`)
    expect(listItem).toHaveStyle(`borderRadius: ${BORDERS.borderRadius4}`)
  })
  it('should render correct style - warning', () => {
    props.type = 'warning'
    render(props)
    screen.getByText('mock listitem content')
    const listItem = screen.getByTestId('ListItem_warning')
    expect(listItem).toHaveStyle(`backgroundColor: ${COLORS.yellow35}`)
    expect(listItem).toHaveStyle(`borderRadius: ${BORDERS.borderRadius4}`)
  })
  it('should call on click when pressed', () => {
    render(props)
    const listItem = screen.getByText('mock listitem content')
    fireEvent.click(listItem)
    expect(props.onClick).toHaveBeenCalled()
  })
})
