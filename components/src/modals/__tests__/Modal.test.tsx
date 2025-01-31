//
import '@testing-library/jest-dom/vitest'
import { screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderWithProviders } from '../../testing/utils'
import { COLORS } from '../../helix-design-system'
import { Modal } from '../Modal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof Modal>) => {
  return renderWithProviders(<Modal {...props} />)
}

describe('Modal', () => {
  let props: ComponentProps<typeof Modal>

  beforeEach(() => {
    props = {
      type: 'info',
      title: 'mock info modal',
      children: <div>mock modal content</div>,
    }
  })

  it('should render modal without header icon when type is info', () => {
    render(props)
    expect(screen.queryByTestId('Modal_header_icon')).not.toBeInTheDocument()
    screen.getByText('mock info modal')
    expect(screen.getByTestId('Modal_header')).toHaveStyle(
      `background-color: ${COLORS.white}`
    )
  })

  it('should render modal with orange header icon when type is warning', () => {
    props.type = 'warning'
    render(props)
    const headerIcon = screen.getByTestId('Modal_header_icon')
    expect(headerIcon).toBeInTheDocument()
    expect(headerIcon).toHaveStyle(`color: ${COLORS.yellow50}`)
    expect(screen.getByTestId('Modal_header')).toHaveStyle(
      `background-color: ${COLORS.white}`
    )
  })

  it('should render modal with red header icon when type is error', () => {
    props.type = 'error'
    render(props)
    const headerIcon = screen.getByTestId('Modal_header_icon')
    expect(headerIcon).toBeInTheDocument()
    expect(headerIcon).toHaveStyle(`color: ${COLORS.red50}`)
    expect(screen.getByTestId('Modal_header')).toHaveStyle(
      `background-color: ${COLORS.white}`
    )
  })

  it('should supply a default margin to account for the sidebar, aligning the modal in the center of the app', () => {
    render(props)
    expect(screen.getByLabelText('ModalShell_ModalArea')).toHaveStyle(
      'width: 31.25rem'
    )
    expect(screen.getByLabelText('ModalShell_ModalArea')).toHaveStyle(
      'margin-left: 5.656rem'
    )
  })
})
