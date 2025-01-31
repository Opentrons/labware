import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS } from '@opentrons/components'
import { renderWithProviders } from '/app/__testing-utils__'
import { OddModalHeader } from '../OddModalHeader'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof OddModalHeader>) => {
  return renderWithProviders(<OddModalHeader {...props} />)[0]
}

describe('OddModalHeader', () => {
  let props: ComponentProps<typeof OddModalHeader>
  beforeEach(() => {
    props = {
      title: 'title',
    }
  })
  it('should render the title', () => {
    render(props)
    screen.getByText('title')
  })
  it('shoulder render the optional props', () => {
    props = {
      ...props,
      hasExitIcon: true,
      iconName: 'information',
      iconColor: COLORS.black90,
      onClick: vi.fn(),
    }
    render(props)
    expect(screen.getByLabelText('icon_information')).toHaveStyle(
      `color: ${COLORS.black90}`
    )
    fireEvent.click(screen.getByLabelText('closeIcon'))
    expect(props.onClick).toHaveBeenCalled()
  })
})
