import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../../../testing/utils'
import { COLORS } from '../../../helix-design-system'
import { SPACING, TYPOGRAPHY } from '../../../ui-style-constants'

import { MenuItem } from '../MenuItem'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof MenuItem>) => {
  return renderWithProviders(<MenuItem {...props} />)[0]
}

describe('MenuItem', () => {
  let props: ComponentProps<typeof MenuItem>

  beforeEach(() => {
    props = {
      children: 'mockMenuItem',
      isAlert: false,
    }
  })

  it('render button with styles', () => {
    render(props)
    const menuItem = screen.getByText('mockMenuItem')
    expect(menuItem).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(menuItem).toHaveStyle(`color: ${COLORS.black90}`)
    expect(menuItem)
      .toHaveStyle(`padding: ${SPACING.spacing8} ${SPACING.spacing12} ${SPACING.spacing8}
    ${SPACING.spacing12}`)
    expect(menuItem).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
  })

  it('render button with styles disabled', () => {
    props = {
      ...props,
      disabled: true,
    }
    render(props)
    const menuItem = screen.getByText('mockMenuItem')
    expect(menuItem).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(menuItem).toHaveStyle(`color: ${COLORS.grey40}`)
    expect(menuItem)
      .toHaveStyle(`padding: ${SPACING.spacing8} ${SPACING.spacing12} ${SPACING.spacing8}
    ${SPACING.spacing12}`)
    expect(menuItem).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
  })
})
