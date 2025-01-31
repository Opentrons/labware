import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ANALYTICS_QUICK_TRANSFER_TIP_MANAGEMENT_TAB } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { ChangeTip } from '../../TipManagement/ChangeTip'
import { TipDropLocation } from '../../TipManagement/TipDropLocation'
import { TipManagement } from '../../TipManagement/'

import type { ComponentProps } from 'react'

vi.mock('../../TipManagement/ChangeTip')
vi.mock('../../TipManagement/TipDropLocation')
vi.mock('/app/redux-resources/analytics')

const render = (props: ComponentProps<typeof TipManagement>): any => {
  return renderWithProviders(<TipManagement {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('TipManagement', () => {
  let props: ComponentProps<typeof TipManagement>

  beforeEach(() => {
    props = {
      state: {
        changeTip: 'once',
        dropTipLocation: {
          cutoutFixtureId: 'trashBinAdapter',
        },
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

  it('renders tip management options and their values', () => {
    render(props)
    screen.getByText('Change tip')
    screen.getByText('Once at the start of the transfer')
    screen.getByText('Tip drop location')
    screen.getByText('Trash bin')
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalledWith({
      name: ANALYTICS_QUICK_TRANSFER_TIP_MANAGEMENT_TAB,
      properties: {},
    })
  })
  it('renders Change tip component when seleted', () => {
    render(props)
    const changeTip = screen.getByText('Change tip')
    fireEvent.click(changeTip)
    expect(vi.mocked(ChangeTip)).toHaveBeenCalled()
  })
  it('renders Drop tip location component when seleted', () => {
    render(props)
    const tipDrop = screen.getByText('Tip drop location')
    fireEvent.click(tipDrop)
    expect(vi.mocked(TipDropLocation)).toHaveBeenCalled()
  })
})
