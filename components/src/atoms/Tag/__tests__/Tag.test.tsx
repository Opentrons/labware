import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { COLORS } from '../../../helix-design-system'
import { renderWithProviders } from '../../../testing/utils'
import { Tag } from '../index'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Tag>) => {
  return renderWithProviders(<Tag {...props} />)
}

describe('Tag', () => {
  let props: ComponentProps<typeof Tag>

  it('should render text, icon with default', () => {
    props = {
      text: 'mockDefault',
      type: 'default',
      iconName: 'ot-alert',
      iconPosition: 'left',
    }
    render(props)
    const tag = screen.getByTestId('Tag_default')
    screen.getByText('mockDefault')
    expect(tag).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity20HexCode}`
    )
    screen.getByLabelText('icon_left_mockDefault')
  })
  it('should render text, right icon with branded', () => {
    props = {
      text: 'mockBranded',
      type: 'branded',
      iconName: 'ot-alert',
      iconPosition: 'right',
    }
    render(props)
    const tag = screen.getByTestId('Tag_branded')
    screen.getByText('mockBranded')
    expect(tag).toHaveStyle(`background-color: ${COLORS.blue50}`)
    screen.getByLabelText('icon_right_mockBranded')
  })
  it('should render text with interactive', () => {
    props = {
      text: 'mockInteractive',
      type: 'interactive',
    }
    render(props)
    const tag = screen.getByTestId('Tag_interactive')
    screen.getByText('mockInteractive')
    expect(tag).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity20HexCode}`
    )
  })
})
