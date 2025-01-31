import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { InputField } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { TipPositionEntry } from '../../QuickTransferAdvancedSettings/TipPosition'

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

const render = (props: ComponentProps<typeof TipPositionEntry>) => {
  return renderWithProviders(<TipPositionEntry {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('TipPosition', () => {
  let props: ComponentProps<typeof TipPositionEntry>

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
        tipPositionAspirate: 10,
        tipPositionDispense: 75,
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

  it('renders the tip position aspirate screen, continue, and back buttons', () => {
    render(props)
    screen.getByText('Aspirate tip position')
    screen.getByTestId('ChildNavigation_Primary_Button')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Distance from bottom of well (mm)',
        error: null,
        readOnly: true,
        type: 'text',
        value: 10,
      },
      {}
    )
    const exitBtn = screen.getByTestId('ChildNavigation_Back_Button')
    fireEvent.click(exitBtn)
    expect(props.onBack).toHaveBeenCalled()
  })

  it('renders the tip position dispense screen', () => {
    props = {
      ...props,
      kind: 'dispense',
    }
    render(props)
    screen.getByText('Dispense tip position')
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Distance from bottom of well (mm)',
        error: null,
        readOnly: true,
        type: 'text',
        value: 75,
      },
      {}
    )
  })

  it('renders correct range if you enter incorrect value for aspirate', () => {
    render(props)
    const deleteBtn = screen.getByText('del')
    fireEvent.click(deleteBtn)
    fireEvent.click(deleteBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Distance from bottom of well (mm)',
        error: 'Value must be between 1 to 100',
        readOnly: true,
        type: 'text',
        value: 0,
      },
      {}
    )
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(saveBtn).toBeDisabled()
  })

  it('renders correct range if you enter incorrect value for dispense', () => {
    props = {
      ...props,
      kind: 'dispense',
    }
    render(props)
    const deleteBtn = screen.getByText('del')
    fireEvent.click(deleteBtn)
    fireEvent.click(deleteBtn)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Distance from bottom of well (mm)',
        error: 'Value must be between 1 to 400',
        readOnly: true,
        type: 'text',
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
    const numButton = screen.getByText('1')
    fireEvent.click(numButton)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })
})
