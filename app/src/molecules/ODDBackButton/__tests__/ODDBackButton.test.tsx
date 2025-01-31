import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS } from '@opentrons/components'
import { ODDBackButton } from '..'
import { renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ODDBackButton>) => {
  return renderWithProviders(<ODDBackButton {...props} />)[0]
}

describe('ODDBackButton', () => {
  let props: ComponentProps<typeof ODDBackButton>

  beforeEach(() => {
    props = {
      label: 'button label',
      onClick: vi.fn(),
    }
  })

  it('should render text and icon', () => {
    render(props)
    screen.getByText('button label')
    expect(screen.getByTestId('back_icon')).toBeInTheDocument()
    const button = screen.getByRole('button')
    expect(button).toHaveStyle(`background-color: ${COLORS.transparent}`)
    fireEvent.click(button)
    expect(props.onClick).toHaveBeenCalled()
  })
})
