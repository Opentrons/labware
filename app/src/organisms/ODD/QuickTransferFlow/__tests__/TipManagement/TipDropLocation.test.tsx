import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { ANALYTICS_QUICK_TRANSFER_SETTING_SAVED } from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { TipDropLocation } from '../../TipManagement/TipDropLocation'

import type { ComponentProps } from 'react'

vi.mock('/app/resources/deck_configuration')
vi.mock('/app/redux-resources/analytics')

const render = (props: ComponentProps<typeof TipDropLocation>): any => {
  return renderWithProviders(<TipDropLocation {...props} />, {
    i18nInstance: i18n,
  })
}
let mockTrackEventWithRobotSerial: any

describe('TipDropLocation', () => {
  let props: ComponentProps<typeof TipDropLocation>

  beforeEach(() => {
    props = {
      onBack: vi.fn(),
      state: {
        dropTipLocation: 'trashBin',
      } as any,
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

  it('renders tip drop location screen, header and save button', () => {
    render(props)
    screen.getByText('Tip drop location')
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.onBack).toHaveBeenCalled()
  })
  it('renders options for each dipsosal location in deck config', () => {
    render(props)
    screen.getByText('Trash bin in A3')
    screen.getByText('Waste chute in C3')
  })
  it('calls dispatch when you select a new option and save', () => {
    render(props)
    const wasteChute = screen.getByText('Waste chute in C3')
    fireEvent.click(wasteChute)
    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)
    expect(props.dispatch).toHaveBeenCalled()
    expect(mockTrackEventWithRobotSerial).toHaveBeenCalledWith({
      name: ANALYTICS_QUICK_TRANSFER_SETTING_SAVED,
      properties: { setting: 'TipDropLocation' },
    })
  })
})
