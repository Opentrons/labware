import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithProviders } from '../../../testing/utils'
import { JUSTIFY_CENTER, JUSTIFY_START } from '../../../styles'
import { EmptySelectorButton } from '../EmptySelectorButton'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof EmptySelectorButton>) => {
  return renderWithProviders(<EmptySelectorButton {...props} />)[0]
}

describe('EmptySelectorButton', () => {
  let props: ComponentProps<typeof EmptySelectorButton>
  beforeEach(() => {
    props = {
      onClick: vi.fn(),
      text: 'mock text',
      iconName: 'add',
      textAlignment: 'left',
    }
  })
  it('renders the props and button cta', () => {
    render(props)
    const button = screen.getByText('mock text')
    fireEvent.click(button)
    expect(props.onClick).toHaveBeenCalled()
    screen.getByTestId('EmptySelectorButton_add')
    expect(screen.getByTestId('EmptySelectorButton_container')).toHaveStyle(
      `justify-content: ${JUSTIFY_START}`
    )
  })
  it('renders middled aligned button', () => {
    props.textAlignment = 'middle'
    props.iconName = undefined
    render(props)
    expect(screen.getByTestId('EmptySelectorButton_container')).toHaveStyle(
      `justify-content: ${JUSTIFY_CENTER}`
    )
    screen.queryByTestId('EmptySelectorButton_add')
  })
})
