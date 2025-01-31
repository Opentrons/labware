import { vi, describe, it, expect, beforeEach } from 'vitest'
import { when } from 'vitest-when'
import '@testing-library/jest-dom/vitest'

import { screen, fireEvent } from '@testing-library/react'
import { COLORS, BORDERS } from '@opentrons/components'

import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { getIsOnDevice } from '/app/redux/config'

import { InterventionModal } from '../'

import type { ComponentProps } from 'react'
import type { ModalType } from '../'
import type { State } from '/app/redux/types'

vi.mock('/app/redux/config')

const MOCK_STATE: State = {
  config: {
    isOnDevice: false,
  },
} as any

const render = (props: ComponentProps<typeof InterventionModal>) => {
  return renderWithProviders(<InterventionModal {...props} />, {
    i18nInstance: i18n,
    initialState: MOCK_STATE,
  })[0]
}

describe('InterventionModal', () => {
  let props: ComponentProps<typeof InterventionModal>

  beforeEach(() => {
    props = {
      iconHeading: 'mock intervention icon heading',
      children: 'mock intervention children',
      iconName: 'alert-circle',
      type: 'intervention-required',
    }
    when(vi.mocked(getIsOnDevice)).calledWith(MOCK_STATE).thenReturn(false)
  })
  ;(['intervention-required', 'error'] as ModalType[]).forEach(type => {
    const color =
      type === 'intervention-required' ? COLORS.blue50 : COLORS.red50
    it(`renders with the ${type} style`, () => {
      render({ ...props, type })
      const header = screen.getByTestId('__otInterventionModalHeader')
      expect(header).toHaveStyle(`background-color: ${color}`)
      const modal = screen.getByTestId('__otInterventionModal')
      expect(modal).toHaveStyle(`border: 6px ${BORDERS.styleSolid} ${color}`)
    })
  })
  it('uses intervention-required if prop is not passed', () => {
    render({ ...props, type: undefined })
    const header = screen.getByTestId('__otInterventionModalHeader')
    expect(header).toHaveStyle(`background-color: ${COLORS.blue50}`)
    const modal = screen.getByTestId('__otInterventionModal')
    expect(modal).toHaveStyle(
      `border: 6px ${BORDERS.styleSolid} ${COLORS.blue50}`
    )
  })
  it('renders passed elements', () => {
    render(props)
    screen.getByText('mock intervention children')
    screen.getByText('mock intervention icon heading')
  })
  it('renders an icon if an icon is specified', () => {
    const { container } = render(props)
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const icon = container.querySelector(
      '[aria-roledescription="alert-circle"]'
    )
    expect(icon).not.toBeNull()
  })
  it('does not render an icon if no icon is specified', () => {
    const { container } = render({ ...props, iconName: undefined })
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container
    const icon = container.querySelector(
      '[aria-roledescription="alert-circle"]'
    )
    expect(icon).toBeNull()
  })

  it('renders title heading text if passed', () => {
    props = { ...props, titleHeading: 'mock intervention title heading' }
    render(props)
    screen.getByText('mock intervention title heading')
  })

  it('fires an onClick when clicking on the iconHeading if passed', () => {
    const mockOnClick = vi.fn()
    props = { ...props, iconHeadingOnClick: mockOnClick }
    render(props)

    fireEvent.click(screen.getByText('mock intervention icon heading'))

    expect(mockOnClick).toHaveBeenCalled()
  })

  it('renders the alternative desktop style when isOnDevice is false', () => {
    render(props)

    expect(screen.getByTestId('__otInterventionModal')).toHaveStyle({
      width: '47rem',
      maxHeight: '100%',
    })
  })

  it('renders the alternative ODD style when isOnDevice is true', () => {
    when(vi.mocked(getIsOnDevice)).calledWith(MOCK_STATE).thenReturn(true)
    render(props)

    expect(screen.getByTestId('__otInterventionModal')).toHaveStyle({
      width: '62rem',
      height: '35.5rem',
    })
  })
})
