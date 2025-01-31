import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { useInstrumentsQuery } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useIsOEMMode } from '/app/resources/robot-settings/hooks'
import { SelectPipette } from '../SelectPipette'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/robot-settings/hooks')

const render = (props: ComponentProps<typeof SelectPipette>) => {
  return renderWithProviders(<SelectPipette {...props} />, {
    i18nInstance: i18n,
  })
}

describe('SelectPipette', () => {
  let props: ComponentProps<typeof SelectPipette>

  beforeEach(() => {
    props = {
      onNext: vi.fn(),
      onBack: vi.fn(),
      exitButtonProps: {
        buttonType: 'tertiaryLowLight',
        buttonText: 'Exit',
        onClick: vi.fn(),
      },
      state: {},
      dispatch: vi.fn(),
    }
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            instrumentType: 'pipette',
            mount: 'left',
            ok: true,
            firmwareVersion: 12,
            instrumentName: 'p10_single',
            instrumentModel: 'p1000_multi_v3.4',
            data: {},
          } as any,
          {
            instrumentType: 'pipette',
            mount: 'right',
            ok: true,
            firmwareVersion: 12,
            instrumentName: 'p10_single',
            instrumentModel: 'p1000_multi_v3.4',
            data: {},
          } as any,
        ],
      },
    } as any)
    vi.mocked(useIsOEMMode).mockReturnValue(false)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the select pipette screen, header, and exit button', () => {
    render(props)
    screen.getByText('Select attached pipette')
    screen.getByText(
      'Quick transfer options depend on the pipettes currently attached to your robot.'
    )
    const exitBtn = screen.getByText('Exit')
    fireEvent.click(exitBtn)
    expect(props.exitButtonProps.onClick).toHaveBeenCalled()
  })

  it('renders continue button and it is disabled if no pipette is selected', () => {
    render(props)
    screen.getByText('Continue')
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
  })

  it('renders both pipette buttons if there are two attached', () => {
    render(props)
    screen.getByText('Left Mount')
    screen.getByText('Right Mount')
  })

  it('selects pipette by default if there is one in state, button will be enabled', () => {
    render({ ...props, state: { mount: 'left' } })
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(props.onNext).toHaveBeenCalled()
  })

  it('enables continue button if you click a pipette', () => {
    render(props)
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
    const leftButton = screen.getByText('Left Mount')
    fireEvent.click(leftButton)
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(props.onNext).toHaveBeenCalled()
  })

  it('renders left and right button if 96 is attached and automatically selects the pipette', () => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: {
        data: [
          {
            instrumentType: 'pipette',
            mount: 'left',
            ok: true,
            firmwareVersion: 12,
            instrumentName: 'p1000_96',
            instrumentModel: 'p1000_96_v1',
            data: {},
          } as any,
        ],
      },
    } as any)
    render(props)
    screen.getByText('Left + Right Mount')
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeEnabled()
  })
})
