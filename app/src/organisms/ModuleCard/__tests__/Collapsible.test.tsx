import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { Collapsible } from '../Collapsible'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Collapsible>) => {
  return renderWithProviders(<Collapsible {...props} />)[0]
}

describe('Collapsible', () => {
  let props: ComponentProps<typeof Collapsible>
  beforeEach(() => {
    props = {
      expanded: false,
      title: 'title',
      toggleExpanded: vi.fn(),
      children: <div>children</div>,
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders collapsible with default icons and not expanded', () => {
    render(props)
    fireEvent.click(screen.getByRole('heading', { name: 'title' }))
    expect(props.toggleExpanded).toHaveBeenCalled()
    screen.getByText('children')
  })
  it('renders collapsible with default icon and expanded', () => {
    props = {
      expanded: true,
      title: 'title',
      toggleExpanded: vi.fn(),
      children: <div>children</div>,
    }
    render(props)
    fireEvent.click(screen.getByRole('heading', { name: 'title' }))
    expect(props.toggleExpanded).toHaveBeenCalled()
  })
  it('renders collapsible with different icon and not expanded', () => {
    props = {
      expanded: true,
      title: 'title',
      toggleExpanded: vi.fn(),
      children: <div>children</div>,
      expandedIcon: 'chevron-down',
      collapsedIcon: 'chevron-up',
    }
    render(props)
    fireEvent.click(screen.getByRole('heading', { name: 'title' }))
    expect(props.toggleExpanded).toHaveBeenCalled()
    screen.getByText('children')
  })
  it('renders collapsible with different icon and expanded', () => {
    props = {
      expanded: true,
      title: 'title',
      toggleExpanded: vi.fn(),
      children: <div>children</div>,
      expandedIcon: 'chevron-down',
      collapsedIcon: 'chevron-up',
    }
    render(props)
    fireEvent.click(screen.getByRole('heading', { name: 'title' }))
    expect(props.toggleExpanded).toHaveBeenCalled()
  })
})
