import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { InputField } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { Mix } from '../../QuickTransferAdvancedSettings/Mix'

import type { ComponentProps } from 'react'
import type { QuickTransferSummaryState } from '../../types'

vi.mock('/app/redux-resources/analytics')
vi.mock('../utils')

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof InputField>()
  return {
    ...actualComponents,
    InputField: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof Mix>) => {
  return renderWithProviders(<Mix {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('Mix', () => {
  let props: ComponentProps<typeof Mix>

  beforeEach(() => {
    props = {
      onBack: vi.fn(),
      kind: 'aspirate',
      state: {
        mount: 'left',
        pipette: {
          channels: 1,
          liquids: [
            {
              maxVolume: 1000,
              minVolume: 5,
            },
          ] as any,
        } as any,
        tipRack: {
          wells: {
            A1: {
              totalLiquidVolume: 200,
            },
          } as any,
        } as any,
        sourceWells: ['A1'],
        destinationWells: ['A1'],
        transferType: 'transfer',
        volume: 20,
        path: 'single',
      } as QuickTransferSummaryState,
      dispatch: vi.fn(),
    }
    mockTrackEventWithRobotSerial = vi.fn(
      () => new Promise(resolve => resolve({}))
    )
    vi.mocked(useTrackEventWithRobotSerial).mockReturnValue({
      trackEventWithRobotSerial: mockTrackEventWithRobotSerial,
    })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the first Mix screen, continue, and back buttons', () => {
    render(props)
    screen.getByText('Mix before aspirating')
    screen.getByTestId('ChildNavigation_Primary_Button')
    screen.getByText('Enabled')
    screen.getByText('Disabled')
    const exitBtn = screen.getByTestId('ChildNavigation_Back_Button')
    fireEvent.click(exitBtn)
    expect(props.onBack).toHaveBeenCalled()
  })

  it('renders the different copy for Mix on dispense', () => {
    props = {
      ...props,
      kind: 'dispense',
    }
    render(props)
    screen.getByText('Mix before dispensing')
  })

  it('renders save button if you select enabled, then moves to second screen', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix volume (µL)',
        error: null,
        readOnly: true,
        type: 'number',
        value: null,
      },
      {}
    )
  })

  it('calls dispatch button if you select disabled and save', () => {
    render(props)
    const disabledBtn = screen.getByText('Disabled')
    fireEvent.click(disabledBtn)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })

  it('has correct Mix volume range', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    const oneButton = screen.getByText('0')
    fireEvent.click(oneButton)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix volume (µL)',
        error: 'Value must be between 1 to 200',
        readOnly: true,
        type: 'number',
        value: 0,
      },
      {}
    )
    const nextBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(nextBtn).toBeDisabled()
  })

  it('has correct range for Mix repitition range', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    const oneButton = screen.getByText('1')
    fireEvent.click(oneButton)
    const nextBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(nextBtn)
    const zeroButton = screen.getByText('0')
    fireEvent.click(zeroButton)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix repetitions',
        error: 'Value must be between 1 to 999',
        readOnly: true,
        type: 'number',
        value: 0,
      },
      {}
    )
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(saveBtn).toBeDisabled()
  })

  it('calls dispatch when an in range value is entered and saved', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    const oneButton = screen.getByText('1')
    fireEvent.click(oneButton)
    const nextBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(nextBtn)
    const twoButton = screen.getByText('2')
    fireEvent.click(twoButton)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })

  it('persists previously set value saved in state for aspirate', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        mixOnAspirate: {
          mixVolume: 15,
          repititions: 55,
        },
      },
    }
    render(props)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix volume (µL)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 15,
      },
      {}
    )
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix repetitions',
        error: null,
        readOnly: true,
        type: 'number',
        value: 55,
      },
      {}
    )
  })

  it('persists previously set value saved in state for dispense', () => {
    props = {
      ...props,
      kind: 'dispense',
      state: {
        ...props.state,
        mixOnDispense: {
          mixVolume: 18,
          repititions: 2,
        },
      },
    }
    render(props)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix volume (µL)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 18,
      },
      {}
    )
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Mix repetitions',
        error: null,
        readOnly: true,
        type: 'number',
        value: 2,
      },
      {}
    )
  })
})
