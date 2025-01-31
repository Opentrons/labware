import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SelectDestLabware } from '../SelectDestLabware'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')
const render = (props: ComponentProps<typeof SelectDestLabware>) => {
  return renderWithProviders(<SelectDestLabware {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SelectDestLabware', () => {
  let props: ComponentProps<typeof SelectDestLabware>

  beforeEach(() => {
    props = {
      onNext: vi.fn(),
      onBack: vi.fn(),
      exitButtonProps: {
        buttonType: 'tertiaryLowLight',
        buttonText: 'Exit',
        onClick: vi.fn(),
      },
      state: {
        mount: 'left',
        pipette: {
          channels: 1,
        } as any,
      },
      dispatch: vi.fn(),
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the select destination labware screen, header, and exit button', () => {
    render(props)
    screen.getByText('Select destination labware')
    const exitBtn = screen.getByText('Exit')
    fireEvent.click(exitBtn)
    expect(props.exitButtonProps.onClick).toHaveBeenCalled()
  })

  it('renders continue button and it is disabled if no labware is selected', () => {
    render(props)
    screen.getByText('Continue')
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
  })

  it('selects labware by default if there is one in state, button will be enabled', () => {
    render({
      ...props,
      state: {
        pipette: {
          channels: 1,
        } as any,
        destination: {
          metadata: {
            displayName: 'destination labware name',
          },
        } as any,
      },
    })
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(props.onNext).toHaveBeenCalled()
    expect(props.dispatch).toHaveBeenCalled()
  })

  it('renders all categories for a single channel pipette', () => {
    render(props)
    screen.getByText('All labware')
    screen.getByText('Well plates')
    screen.getByText('Reservoirs')
    screen.getByText('Tube racks')
  })

  it.fails('does not render tube rack tab for multi channel pipette', () => {
    render({ ...props, state: { pipette: { channels: 8 } as any } })
    screen.getByText('Tube racks')
  })

  it('renders the source labware as the first option', () => {
    render({
      ...props,
      state: {
        pipette: { channels: 8 } as any,
        source: { metadata: { displayName: 'source labware name' } } as any,
      },
    })
    render(props)
    screen.getByText('Source labware in C2')
    screen.getByText('source labware name')
  })
  it('enables continue button if you select a labware', () => {
    render({
      ...props,
      state: {
        pipette: { channels: 8 } as any,
        source: { metadata: { displayName: 'source labware name' } } as any,
      },
    })
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
    const sourceLabware = screen.getByText('Source labware in C2')
    fireEvent.click(sourceLabware)
    expect(continueBtn).toBeEnabled()
  })
})
