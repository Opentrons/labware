import { screen, fireEvent } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { AboutGripperSlideout } from '../AboutGripperSlideout'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof AboutGripperSlideout>) => {
  return renderWithProviders(<AboutGripperSlideout {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('AboutGripperSlideout', () => {
  let props: ComponentProps<typeof AboutGripperSlideout>
  beforeEach(() => {
    props = {
      serialNumber: '123',
      isExpanded: true,
      onCloseClick: vi.fn(),
    }
  })

  it('renders correct info', () => {
    render(props)

    screen.getByText('About Flex Gripper')
    screen.getByText('123')
    screen.getByText('SERIAL NUMBER')
    const button = screen.getByRole('button', { name: /exit/i })
    fireEvent.click(button)
    expect(props.onCloseClick).toHaveBeenCalled()
  })
  it('renders the firmware version if it exists', () => {
    props = { ...props, firmwareVersion: '12' }
    render(props)

    screen.getByText('CURRENT VERSION')
    screen.getByText('12')
  })
})
