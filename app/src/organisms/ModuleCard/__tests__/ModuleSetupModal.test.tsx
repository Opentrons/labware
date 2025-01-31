import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ModuleSetupModal } from '../ModuleSetupModal'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ModuleSetupModal>) => {
  return renderWithProviders(<ModuleSetupModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ModuleSetupModal', () => {
  let props: ComponentProps<typeof ModuleSetupModal>
  beforeEach(() => {
    props = { close: vi.fn(), moduleDisplayName: 'mockModuleDisplayName' }
  })

  it('should render the correct header', () => {
    render(props)
    screen.getByRole('heading', {
      name: 'mockModuleDisplayName Setup Instructions',
    })
  })
  it('should render the correct body', () => {
    render(props)
    screen.getByText(
      'For step-by-step instructions on setting up your module, consult the Quickstart Guide that came in its box. You can also click the link below or scan the QR code to visit the modules section of the Opentrons Help Center.'
    )
  })
  it('should render a link to the learn more page', () => {
    render(props)
    expect(
      screen
        .getByRole('link', {
          name: 'mockModuleDisplayName setup instructions',
        })
        .getAttribute('href')
    ).toBe('https://support.opentrons.com/s/modules')
  })
  it('should call close when the close button is pressed', () => {
    render(props)
    expect(props.close).not.toHaveBeenCalled()
    const closeButton = screen.getByRole('button', { name: 'Close' })
    fireEvent.click(closeButton)
    expect(props.close).toHaveBeenCalled()
  })
  it('should render variable copy and link if absorbance reader', () => {
    props = {
      ...props,
      isAbsorbanceReader: true,
    }
    render(props)
    screen.getByText(
      'For step-by-step instructions on setting up your module, consult the Quickstart Guide that came in its box. You can also click the link below or scan the QR code to read the module Instruction Manual.'
    )
    expect(
      screen
        .getByRole('link', {
          name: 'mockModuleDisplayName setup instructions',
        })
        .getAttribute('href')
    ).toBe(
      'https://insights.opentrons.com/hubfs/Absorbance%20Plate%20Reader%20Instruction%20Manual.pdf'
    )
  })
})
