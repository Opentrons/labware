import * as React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { InputField } from '../../../atoms/InputField'
import { NumericalKeyboard } from '../../../atoms/SoftwareKeyboard'
import { VolumeEntry } from '../VolumeEntry'

vi.mock('../../../atoms/InputField')
vi.mock('../../../atoms/SoftwareKeyboard')

const render = (props: React.ComponentProps<typeof VolumeEntry>) => {
  return renderWithProviders(<VolumeEntry {...props} />, {
    i18nInstance: i18n,
  })
}

describe('VolumeEntry', () => {
  let props: React.ComponentProps<typeof VolumeEntry>

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
      },
      dispatch: vi.fn(),
    }
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
})
