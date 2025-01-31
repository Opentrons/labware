import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { BlowOut } from '../../QuickTransferAdvancedSettings/BlowOut'

import type { ComponentProps } from 'react'
import type { QuickTransferSummaryState } from '../../types'

vi.mock('/app/resources/deck_configuration')
vi.mock('/app/redux-resources/analytics')
vi.mock('../utils')

const render = (props: ComponentProps<typeof BlowOut>) => {
  return renderWithProviders(<BlowOut {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('BlowOut', () => {
  let props: ComponentProps<typeof BlowOut>

  beforeEach(() => {
    props = {
      kind: 'aspirate',
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
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [
        {
          cutoutId: 'cutoutC3',
          cutoutFixtureId: 'wasteChuteRightAdapterCovered',
        },
        {
          cutoutId: 'cutoutA3',
          cutoutFixtureId: 'trashBinAdapter',
        },
      ],
    } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders the first blow out screen, continue, and back buttons', () => {
    render(props)
    screen.getByText('Blowout after dispensing')
    screen.getByTestId('ChildNavigation_Primary_Button')
    screen.getByText('Enabled')
    screen.getByText('Disabled')
    const exitBtn = screen.getByTestId('ChildNavigation_Back_Button')
    fireEvent.click(exitBtn)
    expect(props.onBack).toHaveBeenCalled()
  })

  it('calls dispatch button if you select disabled and save', () => {
    render(props)
    const disabledBtn = screen.getByText('Disabled')
    fireEvent.click(disabledBtn)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
  })

  it('second screen renders both source and destination wells and deck config trash options for transfer', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    screen.getByText('Source well')
    screen.getByText('Destination well')
    screen.getByText('Trash bin in A3')
    screen.getByText('Waste chute in C3')
  })

  it('second screen renders trash bin in A3 if deck config is empty', () => {
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [] as any,
    } as any)
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    screen.getByText('Trash bin in A3')
  })

  it('second screen renders source well but not dest well for distribute', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
      },
    }
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    screen.getByText('Source well')
    expect(screen.queryByText('Destination well')).not.toBeInTheDocument()
  })

  it('second screen renders dest well but not source well for consolidate', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'consolidate',
      },
    }
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    screen.getByText('Destination well')
    expect(screen.queryByText('Source well')).not.toBeInTheDocument()
  })

  it('enables save button when you make a destination selection and calls dispatch when saved', () => {
    render(props)
    const enabledBtn = screen.getByText('Enabled')
    fireEvent.click(enabledBtn)
    const continueBtn = screen.getByText('Continue')
    fireEvent.click(continueBtn)
    const saveBtn = screen.getByTestId('ChildNavigation_Primary_Button')
    expect(saveBtn).toBeDisabled()
    const destBtn = screen.getByText('Destination well')
    fireEvent.click(destBtn)
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalled()
  })
})
