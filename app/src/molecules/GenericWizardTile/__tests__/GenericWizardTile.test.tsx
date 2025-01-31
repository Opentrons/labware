import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/app/i18n'
import { renderWithProviders } from '/app/__testing-utils__'
import { getIsOnDevice } from '/app/redux/config'
import { GenericWizardTile } from '..'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof GenericWizardTile>) => {
  return renderWithProviders(<GenericWizardTile {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('GenericWizardTile', () => {
  let props: ComponentProps<typeof GenericWizardTile>

  beforeEach(() => {
    props = {
      rightHandBody: <div>right hand body</div>,
      bodyText: 'body',
      proceed: vi.fn(),
      proceedButtonText: <div>Continue</div>,
      header: 'header',
      getHelp: 'getHelpUrl',
    }
    vi.mocked(getIsOnDevice).mockReturnValue(false)
  })
  it('renders correct generic tile information with a help link', () => {
    render(props)
    screen.getByText('body')
    const btn = screen.getByText('Continue')
    screen.getByText('header')
    fireEvent.click(btn)
    expect(props.proceed).toHaveBeenCalled()
    screen.getByText('Need help?')
    expect(screen.queryByText('Go back')).not.toBeInTheDocument()
  })
  it('renders correct generic tile information for on device display', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByText('body')
    screen.getByText('header')
    fireEvent.click(screen.getByRole('button'))
    expect(props.proceed).toHaveBeenCalled()
  })
  it('renders correct generic tile information with a back button', () => {
    props = {
      ...props,
      back: vi.fn(),
    }
    render(props)
    const btn = screen.getByText('Go back')
    fireEvent.click(btn)
    expect(props.back).toHaveBeenCalled()
  })
  it('renders correct generic tile information with back button disabled', () => {
    props = {
      ...props,
      back: vi.fn(),
      backIsDisabled: true,
    }
    render(props)
    const btn = screen.getByLabelText('back')
    fireEvent.click(btn)
    expect(btn).toBeDisabled()
  })
})
