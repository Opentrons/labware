import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { QuickTransferAdvancedSettings } from '../../QuickTransferAdvancedSettings/'
import { useToaster } from '/app/organisms/ToasterOven'
import { PipettePath } from '../../QuickTransferAdvancedSettings/PipettePath'
import { FlowRateEntry } from '../../QuickTransferAdvancedSettings/FlowRate'
import { TipPositionEntry } from '../../QuickTransferAdvancedSettings/TipPosition'
import { Mix } from '../../QuickTransferAdvancedSettings/Mix'
import { Delay } from '../../QuickTransferAdvancedSettings/Delay'
import { TouchTip } from '../../QuickTransferAdvancedSettings/TouchTip'
import { AirGap } from '../../QuickTransferAdvancedSettings/AirGap'
import { BlowOut } from '../../QuickTransferAdvancedSettings/BlowOut'

import type { ComponentProps } from 'react'

vi.mock('/app/redux-resources/analytics')
vi.mock('/app/organisms/ToasterOven')
vi.mock('../../QuickTransferAdvancedSettings/PipettePath')
vi.mock('../../QuickTransferAdvancedSettings/FlowRate')
vi.mock('../../QuickTransferAdvancedSettings/TipPosition')
vi.mock('../../QuickTransferAdvancedSettings/Mix')
vi.mock('../../QuickTransferAdvancedSettings/Delay')
vi.mock('../../QuickTransferAdvancedSettings/TouchTip')
vi.mock('../../QuickTransferAdvancedSettings/AirGap')
vi.mock('../../QuickTransferAdvancedSettings/BlowOut')

const render = (
  props: ComponentProps<typeof QuickTransferAdvancedSettings>
): any => {
  return renderWithProviders(<QuickTransferAdvancedSettings {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any
let mockMakeSnackbar: any

describe('QuickTransferAdvancedSettings', () => {
  let props: ComponentProps<typeof QuickTransferAdvancedSettings>

  beforeEach(() => {
    props = {
      state: {
        pipette: {
          channels: 1,
          liquids: [
            {
              maxVolume: 1000,
              minVolume: 5,
            },
          ] as any,
        } as any,
        mount: 'left',
        tipRack: {
          wells: {
            A1: {
              totalLiquidVolume: 200,
            },
          } as any,
        } as any,
        source: {
          metadata: {
            displayCategory: 'wellPlate',
          },
          wells: {
            A1: {
              totalLiquidVolume: 200,
              depth: 50,
            },
          } as any,
        } as any,
        sourceWells: ['A1'],
        destination: {
          metadata: {
            displayCategory: 'wellPlate',
          },
          wells: {
            A1: {
              totalLiquidVolume: 200,
              depth: 200,
            },
          } as any,
        } as any,
        destinationWells: ['A1'],
        transferType: 'consolidate',
        volume: 20,
        aspirateFlowRate: 570,
        dispenseFlowRate: 890,
        path: 'single',
        tipPositionAspirate: 10,
        preWetTip: false,
        tipPositionDispense: 2,
        changeTip: 'once',
        dropTipLocation: {
          cutoutId: 'cutoutA3',
          cutoutFixtureId: 'trashBinAdapter',
        },
      } as any,
      dispatch: vi.fn(),
    }
    mockTrackEventWithRobotSerial = vi.fn(
      () => new Promise(resolve => resolve({}))
    )
    mockMakeSnackbar = vi.fn()
    vi.mocked(useTrackEventWithRobotSerial).mockReturnValue({
      trackEventWithRobotSerial: mockTrackEventWithRobotSerial,
    })
    vi.mocked(useToaster).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
    } as any)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  // base settings section
  it('renders base setting options and their values', () => {
    render(props)
    screen.getByText('Aspirate flow rate')
    screen.getByText('570 µL/s')
    screen.getByText('Dispense flow rate')
    screen.getByText('890 µL/s')
    screen.getByText('Pipette path')
    screen.getByText('Single transfers')
  })
  it('renders Aspirate flow rate component when seleted', () => {
    render(props)
    const aspirateFlowRate = screen.getByText('Aspirate flow rate')
    fireEvent.click(aspirateFlowRate)
    expect(vi.mocked(FlowRateEntry)).toHaveBeenCalled()
  })
  it('renders Dispense flow rate component when seleted', () => {
    render(props)
    const dispenseFlowRate = screen.getByText('Dispense flow rate')
    fireEvent.click(dispenseFlowRate)
    expect(vi.mocked(FlowRateEntry)).toHaveBeenCalled()
  })
  it('renders Pipette path component when seleted', () => {
    render(props)
    const pipettePath = screen.getByText('Pipette path')
    fireEvent.click(pipettePath)
    expect(vi.mocked(PipettePath)).toHaveBeenCalled()
  })
  it('Pipette path button is disabled if 1 to 1 transfer', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'transfer',
      },
    }
    render(props)
    const pipettePath = screen.getByText('Pipette path')
    fireEvent.click(pipettePath)
    expect(vi.mocked(PipettePath)).not.toHaveBeenCalled()
    expect(mockMakeSnackbar).toHaveBeenCalled()
  })
  it('shows additional information for multi dispense', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
        path: 'multiDispense',
        blowOut: 'dest_well',
        disposalVolume: 40,
      },
    }
    render(props)
    screen.getByText('Pipette path')
    screen.getByText(
      'Multi-dispense, 40 µL disposal volume, blowout into destination well'
    )
  })

  // aspirate/dispense default settings section
  it('renders default aspirate and dispense setting options from summary state', () => {
    render(props)
    screen.getByText('Aspirate Settings')
    expect(screen.getAllByText('Tip position')).toHaveLength(2)
    screen.getByText('10 mm from the bottom')
    screen.getByText('Pre-wet tip')
    expect(screen.getAllByText('Mix')).toHaveLength(2)
    expect(screen.getAllByText('Delay')).toHaveLength(2)
    expect(screen.getAllByText('Touch tip')).toHaveLength(2)
    expect(screen.getAllByText('Air gap')).toHaveLength(2)
    screen.getByText('Dispense Settings')
    screen.getByText('2 mm from the bottom')
    screen.getByText('Blowout')
    expect(screen.getAllByText('Disabled')).toHaveLength(10)
  })

  // aspirate settings
  it('opens aspirate tip position when pressed', () => {
    render(props)
    const aspirateTipPosition = screen.getAllByText('Tip position')[0]
    fireEvent.click(aspirateTipPosition)
    expect(vi.mocked(TipPositionEntry)).toHaveBeenCalled()
  })
  it('renders enabled when pre-wet tip is turned on and calls dispatch when pressed', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        preWetTip: true,
      },
    }
    render(props)
    const preWetTip = screen.getByText('Pre-wet tip')
    expect(screen.getAllByText('Disabled')).toHaveLength(9)
    screen.getByText('Enabled')
    fireEvent.click(preWetTip)
    expect(props.dispatch).toHaveBeenCalled()
  })
  it('renders aspirate mix text when setting has value and opens mix for 1 to 1 transfer', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'transfer',
        mixOnAspirate: {
          mixVolume: 15,
          repititions: 25,
        },
      },
    }
    render(props)
    const mixAspirate = screen.getAllByText('Mix')[0]
    screen.getByText('15 µL, 25 times')
    fireEvent.click(mixAspirate)
    expect(vi.mocked(Mix)).toHaveBeenCalled()
  })
  it('opens aspirate mix for distribute', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
      },
    }
    render(props)
    const mixAspirate = screen.getAllByText('Mix')[0]
    fireEvent.click(mixAspirate)
    expect(vi.mocked(Mix)).toHaveBeenCalled()
  })
  it('does not open aspirate mix for consolidate', () => {
    render(props)
    const mixAspirate = screen.getAllByText('Mix')[0]
    fireEvent.click(mixAspirate)
    expect(vi.mocked(Mix)).not.toHaveBeenCalled()
    expect(mockMakeSnackbar).toHaveBeenCalled()
  })
  it('renders aspirate delay text if there is a value in state and opens delay component when pressed', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        delayAspirate: {
          delayDuration: 5,
          positionFromBottom: 17,
        },
      },
    }
    render(props)
    const delayAspirate = screen.getAllByText('Delay')[0]
    screen.getByText('5s, 17 mm from bottom')
    fireEvent.click(delayAspirate)
    expect(vi.mocked(Delay)).toHaveBeenCalled()
  })
  it('renders aspirate touch tip text and opens component if labware is not a reservoir', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        touchTipAspirate: 8,
      },
    }
    render(props)
    const touchtipAspirate = screen.getAllByText('Touch tip')[0]
    screen.getByText('8 mm from bottom')
    fireEvent.click(touchtipAspirate)
    expect(vi.mocked(TouchTip)).toHaveBeenCalled()
  })
  it('does not open aspirate touch tip component if source labware is a reservoir', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        source: {
          ...props.state.source,
          metadata: {
            displayCategory: 'reservoir',
          } as any,
        },
      },
    }
    render(props)
    const touchtipAspirate = screen.getAllByText('Touch tip')[0]
    fireEvent.click(touchtipAspirate)
    expect(vi.mocked(TouchTip)).not.toHaveBeenCalled()
    expect(mockMakeSnackbar).toHaveBeenCalled()
  })
  it('renders aspirate air gap value if it exists and opens air gap component when pressed', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        airGapAspirate: 2,
      },
    }
    render(props)
    const airGapAspirate = screen.getAllByText('Air gap')[0]
    screen.getByText('2 µL')
    fireEvent.click(airGapAspirate)
    expect(vi.mocked(AirGap)).toHaveBeenCalled()
  })

  // dispense settings
  it('opens dispense tip position when pressed', () => {
    render(props)
    const aspirateTipPosition = screen.getAllByText('Tip position')[1]
    fireEvent.click(aspirateTipPosition)
    expect(vi.mocked(TipPositionEntry)).toHaveBeenCalled()
  })
  it('renders dispense mix text when setting has value and opens mix for 1 to 1 transfer', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'transfer',
        mixOnDispense: {
          mixVolume: 18,
          repititions: 20,
        },
      },
    }
    render(props)
    const mixDispense = screen.getAllByText('Mix')[1]
    screen.getByText('18 µL, 20 times')
    fireEvent.click(mixDispense)
    expect(vi.mocked(Mix)).toHaveBeenCalled()
  })
  it('opens dispense mix for consolidate', () => {
    render(props)
    const mixDispense = screen.getAllByText('Mix')[1]
    fireEvent.click(mixDispense)
    expect(vi.mocked(Mix)).toHaveBeenCalled()
  })
  it('does not open dispense mix for distribute', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'distribute',
      },
    }
    render(props)
    const mixDispense = screen.getAllByText('Mix')[1]
    fireEvent.click(mixDispense)
    expect(vi.mocked(Mix)).not.toHaveBeenCalled()
    expect(mockMakeSnackbar).toHaveBeenCalled()
  })
  it('renders dispense delay text if there is a value in state and opens delay component when pressed', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        delayDispense: {
          delayDuration: 10,
          positionFromBottom: 4,
        },
      },
    }
    render(props)
    const delayDispense = screen.getAllByText('Delay')[1]
    screen.getByText('10s, 4 mm from bottom')
    fireEvent.click(delayDispense)
    expect(vi.mocked(Delay)).toHaveBeenCalled()
  })
  it('renders dispense touch tip text and opens component if labware is not a reservoir', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        touchTipDispense: 1,
      },
    }
    render(props)
    const touchtipDispense = screen.getAllByText('Touch tip')[1]
    screen.getByText('1 mm from bottom')
    fireEvent.click(touchtipDispense)
    expect(vi.mocked(TouchTip)).toHaveBeenCalled()
  })
  it('does not open dispense touch tip component if destination labware is a reservoir', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        destination: {
          metadata: {
            displayCategory: 'reservoir',
          } as any,
        } as any,
      },
    }
    render(props)
    const touchtipDispense = screen.getAllByText('Touch tip')[1]
    fireEvent.click(touchtipDispense)
    expect(vi.mocked(TouchTip)).not.toHaveBeenCalled()
    expect(mockMakeSnackbar).toHaveBeenCalled()
  })
  it('renders dispense air gap value if it exists and opens air gap component when pressed', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        airGapDispense: 9,
      },
    }
    render(props)
    const airGapDispense = screen.getAllByText('Air gap')[1]
    screen.getByText('9 µL')
    fireEvent.click(airGapDispense)
    expect(vi.mocked(AirGap)).toHaveBeenCalled()
  })
  it('renders blowout location if it is a well and opens component when clicked if transfer type', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        transferType: 'transfer',
        blowOut: 'source_well',
      },
    }
    render(props)
    const blowOut = screen.getByText('Blowout')
    screen.getByText('Into source well')
    fireEvent.click(blowOut)
    expect(vi.mocked(BlowOut)).toHaveBeenCalled()
  })
  it('renders blowout location if it is a trash bin and opens component when clicked if consolidate type', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        blowOut: {
          cutoutId: 'cutoutA3',
          cutoutFixtureId: 'trashBinAdapter',
        },
      },
    }
    render(props)
    const blowOut = screen.getByText('Blowout')
    screen.getByText('Into trash bin')
    fireEvent.click(blowOut)
    expect(vi.mocked(BlowOut)).toHaveBeenCalled()
  })
  it('does not render text or open blowout component when clicked if distribute type', () => {
    props = {
      ...props,
      state: {
        ...props.state,
        blowOut: 'source_well',
        transferType: 'distribute',
      },
    }
    render(props)
    const blowOut = screen.getByText('Blowout')
    expect(screen.getAllByText('Disabled')).toHaveLength(10)
    fireEvent.click(blowOut)
    expect(vi.mocked(BlowOut)).not.toHaveBeenCalled()
    expect(mockMakeSnackbar).toHaveBeenCalled()
  })
})
