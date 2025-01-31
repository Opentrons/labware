import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { InputField } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { FlowRateEntry } from '../../QuickTransferAdvancedSettings/FlowRate'

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

const render = (props: ComponentProps<typeof FlowRateEntry>) => {
  return renderWithProviders(<FlowRateEntry {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('FlowRate', () => {
  let props: ComponentProps<typeof FlowRateEntry>

  beforeEach(() => {
    props = {
      onBack: vi.fn(),
      kind: 'aspirate',
      state: {
        mount: 'left',
        pipette: {
          model: 'p50',
          channels: 1,
          liquids: {
            default: {
              maxVolume: 1000,
              minVolume: 5,
              supportedTips: {
                t50: {
                  uiMaxFlowRate: 92,
                  defaultAspirateFlowRate: {
                    default: 30,
                  },
                  defaultDispenseFlowRate: {
                    default: 80,
                  },
                },
              },
            },
          } as any,
        } as any,
        tipRack: {
          wells: {
            A1: {
              totalLiquidVolume: 50,
            },
          } as any,
        } as any,
        sourceWells: ['A1'],
        destinationWells: ['A1'],
        transferType: 'transfer',
        volume: 20,
        path: 'single',
        aspirateFlowRate: 35,
        dispenseFlowRate: 62,
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

  it('renders the flow rate aspirate screen, continue, and back buttons', () => {
    render(props)
    screen.getByText('Aspirate flow rate')
    screen.getByTestId('ChildNavigation_Primary_Button')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Aspirate flow rate (µL/s)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 35,
      },
      {}
    )
    const exitBtn = screen.getByTestId('ChildNavigation_Back_Button')
    fireEvent.click(exitBtn)
    expect(props.onBack).toHaveBeenCalled()
  })

  it('renders the flow rate dispense screen', () => {
    props = {
      ...props,
      kind: 'dispense',
    }
    render(props)
    screen.getByText('Dispense flow rate')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Dispense flow rate (µL/s)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 62,
      },
      {}
    )
  })

  it('renders correct range if you enter incorrect value', () => {
    render(props)
    const deleteBtn = screen.getByText('del')
    fireEvent.click(deleteBtn)
    fireEvent.click(deleteBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Aspirate flow rate (µL/s)',
        error: 'Value must be between 1 to 92',
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
    const deleteBtn = screen.getByText('del')
    fireEvent.click(deleteBtn)
    fireEvent.click(deleteBtn)
    const numButton = screen.getByText('1')
    fireEvent.click(numButton)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })
})
