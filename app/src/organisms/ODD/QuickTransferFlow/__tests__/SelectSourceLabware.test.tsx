import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SelectSourceLabware } from '../SelectSourceLabware'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')
const render = (props: ComponentProps<typeof SelectSourceLabware>) => {
  return renderWithProviders(<SelectSourceLabware {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SelectSourceLabware', () => {
  let props: ComponentProps<typeof SelectSourceLabware>

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

  it('renders the select source labware screen, header, and exit button', () => {
    render(props)
    screen.getByText('Select source labware')
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
        source: {
          metadata: {
            displayName: 'source display name',
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

  it('enables continue button if you select a labware', () => {
    render(props)
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
    const labwareOption = screen.getByText('Bio-Rad 384 Well Plate 50 µL')
    fireEvent.click(labwareOption)
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(props.onNext).toHaveBeenCalled()
    expect(props.dispatch).toHaveBeenCalled()
  })
})
