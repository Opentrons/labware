import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { InputField } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { PipettePath } from '../../QuickTransferAdvancedSettings/PipettePath'
import { useBlowOutLocationOptions } from '../../QuickTransferAdvancedSettings/BlowOut'

import type { ComponentProps } from 'react'
import type { QuickTransferSummaryState } from '../../types'

vi.mock('/app/redux-resources/analytics')
vi.mock('../utils')
vi.mock('../../QuickTransferAdvancedSettings/BlowOut')

vi.mock('@opentrons/components', async importOriginal => {
  const actualComponents = await importOriginal<typeof InputField>()
  return {
    ...actualComponents,
    InputField: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof PipettePath>) => {
  return renderWithProviders(<PipettePath {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('PipettePath', () => {
  let props: ComponentProps<typeof PipettePath>

  beforeEach(() => {
    props = {
      onBack: vi.fn(),
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
        transferType: 'consolidate',
        volume: 20,
        path: 'multiAspirate',
      } as QuickTransferSummaryState,
      dispatch: vi.fn(),
    }
    mockTrackEventWithRobotSerial = vi.fn(
      () => new Promise(resolve => resolve({}))
    )
    vi.mocked(useTrackEventWithRobotSerial).mockReturnValue({
      trackEventWithRobotSerial: mockTrackEventWithRobotSerial,
    })
    vi.mocked(useBlowOutLocationOptions).mockReturnValue([
      {
        location: 'source_well',
        description: 'Source well',
      },
    ])
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the first pipette path screen, continue, back buttons', () => {
    render(props)
    screen.getByText('Pipette path')
    screen.getByTestId('ChildNavigation_Primary_Button')
    const exitBtn = screen.getByTestId('ChildNavigation_Back_Button')
    fireEvent.click(exitBtn)
    expect(props.onBack).toHaveBeenCalled()
  })

  it('renders multi aspirate and single options for consolidate if there is room in the tip', () => {
    render(props)
    screen.getByText('Single transfers')
    screen.getByText('Multi-aspirate')
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })

  it('renders single option only for consolidate if there is not room in the tip', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        volume: 101,
      },
    }
    render(props)
    screen.getByText('Single transfers')
    expect(screen.queryByText('Multi-aspirate')).not.toBeInTheDocument()
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })

  it('renders multi dispense and single options for distribute if there is room in the tip', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
      },
    }
    render(props)
    screen.getByText('Single transfers')
    screen.getByText('Multi-dispense')
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })

  it('renders single option only for distribute if there is not room in the tip', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
        volume: 67,
      },
    }
    render(props)
    screen.getByText('Single transfers')
    expect(screen.queryByText('Multi-dispense')).not.toBeInTheDocument()
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })

  it('renders next cta and disposal volume screen if you choose multi dispense', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
        disposalVolume: 20,
        blowOut: 'source_well',
      },
    }
    render(props)
    const multiDispenseBtn = screen.getByText('Multi-dispense')
    fireEvent.click(multiDispenseBtn)
    const continueBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(continueBtn)

    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Disposal volume (µL)',
        error: null,
        readOnly: true,
        type: 'number',
        value: 20,
      },
      {}
    )
  })

  it('renders error on disposal volume screen if you select an out of range value', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
        path: 'multiDispense',
        disposalVolume: 20,
        blowOut: 'source_well',
      },
    }
    render(props)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    const oneButton = screen.getByText('1')
    fireEvent.click(oneButton)
    expect(vi.mocked(InputField)).toHaveBeenCalledWith(
      {
        title: 'Disposal volume (µL)',
        error: 'Value must be between 1 to 160',
        readOnly: true,
        type: 'number',
        value: 201,
      },
      {}
    )
    const nextBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(nextBtn).toBeDisabled()
  })

  it('renders blowout options on third screen and calls dispatch when saved', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
        path: 'multiDispense',
        disposalVolume: 20,
        blowOut: 'source_well',
      },
    }
    render(props)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    fireEvent.click(continueBtn)
    screen.getByText('Source well')
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })
})
