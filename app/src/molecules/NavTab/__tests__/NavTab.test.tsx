import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SPACING, COLORS, TYPOGRAPHY, BORDERS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { NavTab } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof NavTab>) => {
  return renderWithProviders(
    <MemoryRouter>
      <NavTab {...props} />
    </MemoryRouter>
  )[0]
}

describe('NavTab', () => {
  let props: ComponentProps<typeof NavTab>

  beforeEach(() => {
    props = {
      to: '/protocols',
      tabName: 'protocols',
      disabled: false,
    }
  })

  it('renders navtab with text and link', () => {
    render(props)
    const tab = screen.getByText('protocols')
    expect(tab).toHaveAttribute('href', '/protocols')
    expect(tab).toHaveStyle(
      `padding: 0 ${SPACING.spacing4} ${SPACING.spacing8}`
    )
    expect(tab).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeLabel}`)
    expect(tab).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(tab).toHaveStyle(`color: ${COLORS.grey50}`)
    fireEvent.click(tab)
    expect(tab).toHaveStyle(`color: ${COLORS.black90}`)
    expect(tab).toHaveStyle(`border-bottom-color: ${COLORS.purple50}`)
    expect(tab).toHaveStyle(`border-bottom-width: 2px`)
    expect(tab).toHaveStyle(`border-bottom-style: ${BORDERS.styleSolid}`)
  })

  it('should navtab is disabled if disabled is true', () => {
    props.disabled = true
    render(props)
    const tab = screen.getByText('protocols')
    expect(tab.tagName.toLowerCase()).toBe('span')
    expect(tab).toHaveStyle(
      `padding: 0 ${SPACING.spacing4} ${SPACING.spacing8}`
    )
    expect(tab).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeLabel}`)
    expect(tab).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(tab).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  it('renders navtab when pass to / as to', () => {
    props.to = '/'
    props.tabName = 'root'
    render(props)
    const tab = screen.getByText('root')
    expect(tab).toHaveAttribute('href', '/')
  })
})
