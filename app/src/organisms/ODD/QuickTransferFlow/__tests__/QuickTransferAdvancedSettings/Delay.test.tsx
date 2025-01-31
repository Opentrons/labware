import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { InputField } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { Delay } from '../../QuickTransferAdvancedSettings/Delay'

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

const render = (props: ComponentProps<typeof Delay>) => {
  return renderWithProviders(<Delay {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('Delay', () => {
  let props: ComponentProps<typeof Delay>

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
        source: {
          wells: {
            A1: {
              totalLiquidVolume: 200,
              depth: 50,
            },
          } as any,
        } as any,
        destination: {
          wells: {
            A1: {
              totalLiquidVolume: 200,
              depth: 200,
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

  it('renders the first delay screen, continue, and back buttons', () => {
    render(props)
    screen.getByText('Delay after aspirating')
    screen.getByTestId('ChildNavigation_Primary_Button')
    screen.getByText('Enabled')
    screen.getByText('Disabled')
    const exitBtn = screen.getByTestId('ChildNavigation_Back_Button')
    fireEvent.click(exitBtn)
    expect(props.onBack).toHaveBeenCalled()
  })

  it('renders save button if you select enabled, then moves to second screen', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Delay duration (seconds)',
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

  it('has correct delay duration range', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    const oneButton = screen.getByText('0')
    fireEvent.click(oneButton)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Delay duration (seconds)',
        error: 'Value must be between 1 to 9999999999',
        readOnly: true,
        type: 'number',
        value: 0,
      },
      {}
    )
    const nextBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(nextBtn).toBeDisabled()
  })

  it('has correct range for delay height for aspirate', () => {
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
        title: 'Delay position from bottom of well (mm)',
        error: 'Value must be between 1 to 100',
        readOnly: true,
        type: 'number',
        value: 0,
      },
      {}
    )
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(saveBtn).toBeDisabled()
  })

  it('has correct range for delay height for dispense', () => {
    props = {
      ...props,
      kind: 'dispense',
    }
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
        title: 'Delay position from bottom of well (mm)',
        error: 'Value must be between 1 to 400',
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
        delayAspirate: {
          delayDuration: 15,
          positionFromBottom: 55,
        },
      },
    }
    render(props)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Delay duration (seconds)',
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
        title: 'Delay position from bottom of well (mm)',
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
        delayDispense: {
          delayDuration: 20,
          positionFromBottom: 84,
        },
      },
    }
    render(props)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Delay duration (seconds)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 20,
      },
      {}
    )
    fireEvent.click(continueBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Delay position from bottom of well (mm)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 84,
      },
      {}
    )
  })
})
