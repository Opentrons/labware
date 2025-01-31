import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, afterEach, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SetupStep } from '../SetupStep'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

describe('SetupStep', () => {
  const render = ({
    expanded = true,
    title = 'stub title',
    description = 'stub description',
    toggleExpanded = toggleExpandedMock,
    children = <button>stub children</button>,
    rightElement = <div>right element</div>,
  }: Partial<ComponentProps<typeof SetupStep>> = {}) => {
    return renderWithProviders(
      <SetupStep
        {...{
          expanded,
          title,
          description,
          toggleExpanded,
          children,
          rightElement,
        }}
      />,
      { i18nInstance: i18n }
    )[0]
  }
  let toggleExpandedMock: Mock

  beforeEach(() => {
    toggleExpandedMock = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders children', () => {
    render()
    screen.getByRole('button', { name: 'stub children' })
  })
  it('calls toggle expanded on click', () => {
    render({ expanded: false })
    fireEvent.click(screen.getByText('stub title'))
    expect(toggleExpandedMock).toHaveBeenCalled()
  })
  it('renders text nodes with prop contents', () => {
    render({ expanded: false })
    screen.getByText('stub title')
    screen.queryAllByText('stub description')
    screen.queryAllByText('right element')
  })
})
