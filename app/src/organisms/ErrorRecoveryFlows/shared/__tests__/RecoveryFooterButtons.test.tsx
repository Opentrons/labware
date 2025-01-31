import { vi, describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import { COLORS } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RecoveryFooterButtons } from '../RecoveryFooterButtons'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

const render = (props: ComponentProps<typeof RecoveryFooterButtons>) => {
  return renderWithProviders(<RecoveryFooterButtons {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('RecoveryFooterButtons', () => {
  let props: ComponentProps<typeof RecoveryFooterButtons>
  let mockPrimaryBtnOnClick: Mock
  let mockSecondaryBtnOnClick: Mock
  let mockTertiaryBtnOnClick: Mock

  beforeEach(() => {
    mockPrimaryBtnOnClick = vi.fn()
    mockSecondaryBtnOnClick = vi.fn()
    mockTertiaryBtnOnClick = vi.fn()
    props = {
      primaryBtnOnClick: mockPrimaryBtnOnClick,
      secondaryBtnOnClick: mockSecondaryBtnOnClick,
    }
  })

  it('renders default button copy and click behavior', () => {
    render(props)

    const primaryBtns = screen.getAllByRole('button', { name: 'Continue' })
    const secondaryBtns = screen.getAllByRole('button', { name: 'Go back' })
    expect(primaryBtns.length).toBe(2)
    expect(secondaryBtns.length).toBe(1)

    primaryBtns.forEach(btn => {
      mockPrimaryBtnOnClick.mockReset()
      fireEvent.click(btn)
      expect(mockPrimaryBtnOnClick).toHaveBeenCalled()
    })

    secondaryBtns.forEach(btn => {
      mockSecondaryBtnOnClick.mockReset()
      fireEvent.click(btn)
      expect(mockSecondaryBtnOnClick).toHaveBeenCalled()
    })
  })

  it('renders alternative button text when supplied', () => {
    props = { ...props, primaryBtnTextOverride: 'MOCK_OVERRIDE_TEXT' }
    render(props)

    const secondaries = screen.getAllByRole('button', {
      name: 'MOCK_OVERRIDE_TEXT',
    })
    expect(secondaries.length).toBe(2)
  })

  it('renders the primary button as disabled when primaryBtnDisabled is true', () => {
    props = {
      ...props,
      primaryBtnOnClick: mockPrimaryBtnOnClick,
      primaryBtnDisabled: true,
      primaryBtnTextOverride: 'Hi',
    }
    render(props)

    const primaryBtns = screen.getAllByRole('button', { name: 'Hi' })

    primaryBtns.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })

  it('does not render the secondary button if no on click handler is supplied', () => {
    props = { ...props, secondaryBtnOnClick: undefined }
    render(props)

    expect(
      screen.queryByRole('button', { name: 'Go back' })
    ).not.toBeInTheDocument()
  })

  it('renders correct loading state on the primary button if loading is true', () => {
    props = { ...props, isLoadingPrimaryBtnAction: true }
    render(props)

    const primaryBtns = screen.getAllByRole('button', {
      name: 'loading indicator Continue',
    })

    screen.getByLabelText('loading indicator')
    primaryBtns.forEach(btn => {
      expect(btn).toHaveStyle(`background-color: ${COLORS.blue60}`)
    })
  })

  it('renders the tertiary button when tertiaryBtnOnClick is provided', () => {
    props = { ...props, tertiaryBtnOnClick: mockTertiaryBtnOnClick }
    render(props)

    const tertiaryBtns = screen.getAllByRole('button', { name: '' })
    expect(tertiaryBtns.length).toBe(2)

    tertiaryBtns.forEach(btn => {
      mockTertiaryBtnOnClick.mockReset()
      fireEvent.click(btn)
      expect(mockTertiaryBtnOnClick).toHaveBeenCalled()
    })
  })

  it('renders the tertiary button with custom text when tertiaryBtnText is provided', () => {
    props = { ...props, tertiaryBtnText: 'Hey' }
    render(props)

    const tertiaryBtns = screen.getAllByRole('button', { name: 'Hey' })
    expect(tertiaryBtns.length).toBe(2)
  })

  it('renders the tertiary button as disabled when tertiaryBtnDisabled is true', () => {
    props = {
      ...props,
      tertiaryBtnOnClick: mockTertiaryBtnOnClick,
      tertiaryBtnDisabled: true,
      tertiaryBtnText: 'Hi',
    }
    render(props)

    const tertiaryBtns = screen.getAllByRole('button', { name: 'Hi' })

    tertiaryBtns.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })

  it('renders the secondary button as tertiary when secondaryAsTertiary is true', () => {
    props = {
      ...props,
      secondaryAsTertiary: true,
      secondaryBtnOnClick: mockSecondaryBtnOnClick,
    }
    render(props)

    const secondaryBtn = screen.getAllByRole('button', { name: 'Go back' })
    expect(secondaryBtn.length).toBe(1)

    secondaryBtn.forEach(btn => {
      mockSecondaryBtnOnClick.mockReset()
      fireEvent.click(btn)
      expect(mockSecondaryBtnOnClick).toHaveBeenCalled()
    })
  })

  it('renders secondary button with custom text when secondaryBtnTextOverride is provided', () => {
    props = {
      ...props,
      secondaryBtnTextOverride: 'Custom Back',
    }
    render(props)

    const secondaryBtns = screen.getAllByRole('button', { name: 'Custom Back' })
    expect(secondaryBtns.length).toBe(1)

    secondaryBtns.forEach(btn => {
      mockSecondaryBtnOnClick.mockReset()
      fireEvent.click(btn)
      expect(mockSecondaryBtnOnClick).toHaveBeenCalled()
    })
  })

  it('renders secondary button as tertiary with custom text', () => {
    props = {
      ...props,
      secondaryAsTertiary: true,
      secondaryBtnTextOverride: 'Custom Tertiary',
    }
    render(props)

    const secondaryBtns = screen.getAllByRole('button', {
      name: 'Custom Tertiary',
    })
    expect(secondaryBtns.length).toBe(1)

    secondaryBtns.forEach(btn => {
      mockSecondaryBtnOnClick.mockReset()
      fireEvent.click(btn)
      expect(mockSecondaryBtnOnClick).toHaveBeenCalled()
    })
  })
})
