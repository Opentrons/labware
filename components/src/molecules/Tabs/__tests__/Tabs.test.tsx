import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { BORDERS, COLORS } from '../../../helix-design-system'
import { SPACING } from '../../../ui-style-constants'
import { POSITION_RELATIVE } from '../../../styles'
import { renderWithProviders } from '../../../testing/utils'
import { Tabs } from '../index'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Tabs>) => {
  return renderWithProviders(<Tabs {...props} />)
}

describe('Tabs', () => {
  let props: ComponentProps<typeof Tabs>

  beforeEach(() => {
    props = {
      tabs: [
        { text: 'set up', onClick: vi.fn() },
        { text: 'parameters', onClick: vi.fn() },
        { text: 'module controls', onClick: vi.fn() },
      ],
    }
  })

  it('renders unclicked tabs with text', () => {
    render(props)

    const tabTexts = ['set up', 'parameters', 'module controls']
    const tabStyles = {
      backgroundColor: COLORS.purple30,
      borderRadius: BORDERS.borderRadius8,
      padding: `${SPACING.spacing8} ${SPACING.spacing16}`,
      position: POSITION_RELATIVE,
    }

    tabTexts.forEach(text => {
      const tab = screen.getByText(text)
      expect(tab).not.toBeNull()

      Object.entries(tabStyles).forEach(([key, value]) => {
        expect(tab).toHaveStyle(`${key}: ${value}`)
      })
    })
  })

  it('renders an active tab', () => {
    props.tabs[0].isActive = true

    render(props)

    const tab1 = screen.getByText('set up')

    expect(tab1).toHaveStyle(`background-color: ${COLORS.purple50}`)
    expect(tab1).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('should call the right click handler when clicked', () => {
    render(props)

    const tabList = props.tabs

    fireEvent.click(screen.getByText('set up'))
    expect(tabList[0].onClick).toHaveBeenCalled()

    fireEvent.click(screen.getByText('parameters'))
    expect(tabList[1].onClick).toHaveBeenCalled()

    fireEvent.click(screen.getByText('module controls'))
    expect(tabList[2].onClick).toHaveBeenCalled()
  })

  it('should show right style when disabled', () => {
    props = {
      tabs: [
        { text: 'set up', onClick: vi.fn(), disabled: true },
        { text: 'parameters', onClick: vi.fn() },
        { text: 'module controls', onClick: vi.fn() },
      ],
    }
    render(props)
    const tab = screen.getByText('set up')
    expect(tab).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(tab).toHaveStyle(`color: ${COLORS.grey40}`)

    fireEvent.click(tab)
    expect(props.tabs[0].onClick).not.toHaveBeenCalled()
  })
})
