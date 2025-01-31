import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ChangeTip } from '../../TipManagement/ChangeTip'

import type { ComponentProps } from 'react'

vi.mock('/app/redux-resources/analytics')

const render = (props: ComponentProps<typeof ChangeTip>): any => {
  return renderWithProviders(<ChangeTip {...props} />, {
    i18nInstance: i18n,
  })
}

let mockTrackEventWithRobotSerial: any

describe('ChangeTip', () => {
  let props: ComponentProps<typeof ChangeTip>

  beforeEach(() => {
    props = {
      onBack: vi.fn(),
      state: {
        changeTip: 'once',
        sourceWells: ['A1'],
        destinationWells: ['A1'],
        path: 'single',
        pipette: { channels: 1 },
        transferType: 'transfer',
      } as any,
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

  it('renders change tip screen, header and save button', () => {
    render(props)
    screen.getByText('Change tip')
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.onBack).toHaveBeenCalled()
  })
  it('calls dispatch when you select a new option and save', () => {
    render(props)
    screen.getByText('Change tip')
    screen.getByText('Once at the start of the transfer')
    const perSource = screen.getByText('Before every aspirate')
    fireEvent.click(perSource)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalledWith({
      name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
      properties: { setting: 'ChangeTip' },
    })
  })
  it('renders correct change tip options when single transfer of less than 96 wells', () => {
    render(props)
    screen.getByText('Change tip')
    screen.getByText('Once at the start of the transfer')
    screen.getByText('Before every aspirate')
    screen.getByText('Per source well')
  })
  it('renders correct change tip options for consolidate with less than 96 wells', () => {
    render({ ...props, state: { ...props.state, transferType: 'consolidate' } })
    screen.getByText('Change tip')
    screen.getByText('Once at the start of the transfer')
    screen.getByText('Before every aspirate')
    screen.getByText('Per source well')
  })
  it('renders correct change tip options for distribute with less than 96 wells', () => {
    render({ ...props, state: { ...props.state, transferType: 'distribute' } })
    screen.getByText('Change tip')
    screen.getByText('Once at the start of the transfer')
    screen.getByText('Before every aspirate')
    screen.getByText('Per destination well')
  })
  it('renders correct change tip options any transfer with more than 96 wells', () => {
    render({
      ...props,
      state: {
        ...props.state,
        destinationWells: [
          'A1',
          'B1',
          'C1',
          'D1',
          'E1',
          'F1',
          'G1',
          'H1',
          'I1',
          'J1',
          'K1',
          'L1',
          'M1',
          'N1',
          'O1',
          'P1',
          'A2',
          'B2',
          'C2',
          'D2',
          'E2',
          'F2',
          'G2',
          'H2',
          'I2',
          'J2',
          'K2',
          'L2',
          'M2',
          'N2',
          'O2',
          'P2',
          'A3',
          'B3',
          'C3',
          'D3',
          'E3',
          'F3',
          'G3',
          'H3',
          'I3',
          'J3',
          'K3',
          'L3',
          'M3',
          'N3',
          'O3',
          'P3',
          'A4',
          'B4',
          'C4',
          'D4',
          'E4',
          'F4',
          'G4',
          'H4',
          'I4',
          'J4',
          'K4',
          'L4',
          'M4',
          'N4',
          'O4',
          'P4',
          'A5',
          'B5',
          'C5',
          'D5',
          'E5',
          'F5',
          'G5',
          'H5',
          'I5',
          'J5',
          'K5',
          'L5',
          'M5',
          'N5',
          'O5',
          'P5',
          'A6',
          'B6',
          'C6',
          'D6',
          'E6',
          'F6',
          'G6',
          'H6',
          'I6',
          'J6',
          'K6',
          'L6',
          'M6',
          'N6',
          'O6',
          'P6',
          'A7',
          'B7',
          'C7',
          'D7',
          'E7',
          'F7',
          'G7',
          'H7',
          'I7',
          'J7',
          'K7',
          'L7',
          'M7',
          'N7',
          'O7',
          'P7',
        ],
      },
    })
    screen.getByText('Change tip')
    screen.getByText('Once at the start of the transfer')
  })
})
