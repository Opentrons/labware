import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SelectTipRack } from '../SelectTipRack'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')
const render = (props: ComponentProps<typeof SelectTipRack>) => {
  return renderWithProviders(<SelectTipRack {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SelectTipRack', () => {
  let props: ComponentProps<typeof SelectTipRack>

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
          liquids: {
            default: {
              defaultTipracks: [
                'opentrons/opentrons_flex_96_tiprack_1000ul/1',
                'opentrons/opentrons_flex_96_tiprack_200ul/1',
                'opentrons/opentrons_flex_96_tiprack_50ul/1',
                'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
                'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
                'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
              ],
            },
          },
        } as any,
      },
      dispatch: vi.fn(),
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the select tip rack screen, header, and exit button', () => {
    render(props)
    screen.getByText('Select tip rack')
    const exitBtn = screen.getByText('Exit')
    fireEvent.click(exitBtn)
    expect(props.exitButtonProps.onClick).toHaveBeenCalled()
  })

  it('renders continue button and it is disabled if no tip rack is selected', () => {
    render(props)
    screen.getByText('Continue')
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
  })

  it('selects tip rack by default if there is one in state, button will be enabled', () => {
    render({ ...props, state: { tipRack: { def: 'definition' } as any } })
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(props.onNext).toHaveBeenCalled()
  })

  it('enables continue button if you click a tip rack', () => {
    render(props)
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
    const tipRackButton = screen.getByText('Opentrons Flex 96 Tip Rack 200 µL')
    fireEvent.click(tipRackButton)
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(props.onNext).toHaveBeenCalled()
  })
})
