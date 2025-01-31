import { screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '../../testing/utils'
import { ModalHeader } from '../ModalHeader'
import { COLORS } from '../../helix-design-system'
import { SPACING } from '../../ui-style-constants'
import { ALIGN_CENTER, JUSTIFY_CENTER } from '../../styles'

import type { ComponentProps } from 'react'

const mockClose = vi.fn()

const render = (props: ComponentProps<typeof ModalHeader>) => {
  return renderWithProviders(<ModalHeader {...props} />)
}

describe('ModalHeader', () => {
  let props: ComponentProps<typeof ModalHeader>

  beforeEach(() => {
    props = {
      onClose: mockClose,
      title: 'mock modal header title',
      backgroundColor: COLORS.white,
      color: COLORS.black90,
    }
  })

  it('should render text and close icon', () => {
    render(props)
    const title = screen.getByText('mock modal header title')
    expect(title).toHaveStyle(`color: ${COLORS.black90}`)
    screen.getByTestId('ModalHeader_icon_close_mock modal header title')
  })

  it('should render text, icon, and close icon', () => {
    props.icon = {
      name: 'ot-alert',
      color: COLORS.black90,
      size: '1.25rem',
      marginRight: SPACING.spacing8,
    }
    render(props)
    expect(screen.getByTestId('Modal_header_icon')).toHaveStyle(
      `color: ${COLORS.black90}`
    )
    expect(screen.getByTestId('Modal_header_icon')).toHaveStyle(
      `width: 1.25rem`
    )
    expect(screen.getByTestId('Modal_header_icon')).toHaveStyle(
      `height: 1.25rem`
    )
    expect(screen.getByTestId('Modal_header_icon')).toHaveStyle(
      `margin-right: ${SPACING.spacing8}`
    )
  })

  it('should call a mock function when clicking close icon', () => {
    render(props)
    const closeIcon = screen.getByTestId(
      'ModalHeader_icon_close_mock modal header title'
    )
    expect(closeIcon).toHaveStyle('width: 1.625rem')
    expect(closeIcon).toHaveStyle('height: 1.625rem')
    expect(closeIcon).toHaveStyle('display: flex')
    expect(closeIcon).toHaveStyle(`justify-content: ${JUSTIFY_CENTER}`)
    expect(closeIcon).toHaveStyle(`align-items: ${ALIGN_CENTER}`)
    expect(closeIcon).toHaveStyle('border-radius: 0.875rem')
    fireEvent.click(closeIcon)
    expect(mockClose).toHaveBeenCalled()
  })
})
