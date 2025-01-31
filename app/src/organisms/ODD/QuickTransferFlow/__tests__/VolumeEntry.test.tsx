import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { InputField } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { NumericalKeyboard } from '/app/atoms/SoftwareKeyboard'
import { getVolumeRange } from '../utils'
import { VolumeEntry } from '../VolumeEntry'

import type { ComponentProps } from 'react'

vi.mock('/app/atoms/SoftwareKeyboard')
vi.mock('../utils')

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof InputField>()
  return {
    ...actualComponents,
    InputField: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof VolumeEntry>) => {
  return renderWithProviders(<VolumeEntry {...props} />, {
    i18nInstance: i18n,
  })
}

describe('VolumeEntry', () => {
  let props: ComponentProps<typeof VolumeEntry>

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
        sourceWells: ['A1'],
        destinationWells: ['A1'],
        transferType: 'transfer',
      },
      dispatch: vi.fn(),
    }
    vi.mocked(getVolumeRange).mockReturnValue({ min: 5, max: 50 })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the volume entry screen, continue, and exit buttons', () => {
    render(props)
    const exitBtn = screen.getByText('Exit')
    fireEvent.click(exitBtn)
    expect(props.exitButtonProps.onClick).toHaveBeenCalled()
    expect(vi.mocked(InputField)).toHaveBeenCalled()
    expect(vi.mocked(NumericalKeyboard)).toHaveBeenCalled()
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
  })

  it('renders transfer text if there are more destination wells than source wells', () => {
    render(props)
    screen.getByText('Set transfer volume')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Volume per well (µL)',
        error: null,
        readOnly: true,
        type: 'text',
        value: '',
      },
      {}
    )
  })

  it('renders dispense text if there are more destination wells than source wells', () => {
    render({
      ...props,
      state: {
        sourceWells: ['A1'],
        destinationWells: ['A1', 'A2'],
        transferType: 'distribute',
      },
    })
    render(props)
    screen.getByText('Set dispense volume')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Dispense volume per well (µL)',
        error: null,
        readOnly: true,
        type: 'text',
        value: '',
      },
      {}
    )
  })

  it('renders aspirate text if there are more destination wells than source wells', () => {
    render({
      ...props,
      state: {
        sourceWells: ['A1', 'A2'],
        destinationWells: ['A1'],
        transferType: 'consolidate',
      },
    })
    render(props)
    screen.getByText('Set aspirate volume')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Aspirate volume per well (µL)',
        error: null,
        readOnly: true,
        type: 'text',
        value: '',
      },
      {}
    )
  })

  it('calls on next and dispatch if you press continue when volume is non-null and within range', () => {
    render({
      ...props,
      state: {
        sourceWells: ['A1', 'A2'],
        destinationWells: ['A1'],
        transferType: 'consolidate',
        volume: 20,
      },
    })
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeEnabled()
    fireEvent.click(continueBtn)
    expect(vi.mocked(props.onNext)).toHaveBeenCalled()
    expect(vi.mocked(props.dispatch)).toHaveBeenCalled()
  })

  it('displays an error and disables continue when volume is outside of range', () => {
    render({
      ...props,
      state: {
        sourceWells: ['A1', 'A2'],
        destinationWells: ['A1'],
        transferType: 'consolidate',
        volume: 90,
      },
    })
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(continueBtn).toBeDisabled()
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Aspirate volume per well (µL)',
        error: 'Value must be between 5 to 50',
        readOnly: true,
        type: 'text',
        value: '90',
      },
      {}
    )
  })
})
