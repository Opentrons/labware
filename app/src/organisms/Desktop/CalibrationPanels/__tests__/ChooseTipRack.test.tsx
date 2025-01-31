import { fireEvent, screen } from '@testing-library/react'
import { vi, it, describe, expect, beforeEach } from 'vitest'

import { usePipettesQuery } from '@opentrons/react-api-client'
import { LEFT } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipette } from '/app/redux/pipettes/__fixtures__'
import { mockDeckCalTipRack } from '/app/redux/sessions/__fixtures__'
import { mockTipRackDefinition } from '/app/redux/custom-labware/__fixtures__'
import { Select } from '/app/atoms/SelectField/Select'
import {
  getCalibrationForPipette,
  getTipLengthForPipetteAndTiprack,
  getTipLengthCalibrations,
} from '/app/redux/calibration'
import { getCustomTipRackDefinitions } from '/app/redux/custom-labware'
import { ChooseTipRack } from '../ChooseTipRack'

import type { ComponentProps } from 'react'
import type { AttachedPipettesByMount } from '/app/redux/pipettes/types'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/pipettes/selectors')
vi.mock('/app/redux/calibration')
vi.mock('/app/redux/custom-labware/selectors')
vi.mock('/app/atoms/SelectField/Select')

const mockAttachedPipettes: AttachedPipettesByMount = {
  left: mockAttachedPipette,
  right: null,
} as any

const render = (props: ComponentProps<typeof ChooseTipRack>) => {
  return renderWithProviders(<ChooseTipRack {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ChooseTipRack', () => {
  let props: ComponentProps<typeof ChooseTipRack>

  beforeEach(() => {
    vi.mocked(Select).mockReturnValue(<div>mock select</div>)
    vi.mocked(getCalibrationForPipette).mockReturnValue(null)
    vi.mocked(getTipLengthForPipetteAndTiprack).mockReturnValue(null)
    vi.mocked(getTipLengthCalibrations).mockReturnValue([])
    vi.mocked(usePipettesQuery).mockReturnValue({
      data: mockAttachedPipettes,
    } as any)
    vi.mocked(getCustomTipRackDefinitions).mockReturnValue([
      mockTipRackDefinition,
      mockDeckCalTipRack.definition,
    ])
    props = {
      tipRack: mockDeckCalTipRack,
      mount: LEFT,
      chosenTipRack: null,
      handleChosenTipRack: vi.fn(),
      closeModal: vi.fn(),
      robotName: 'otie',
    }
  })

  it('renders the correct text', () => {
    render(props)
    screen.getByText('Choose a tip rack')
    screen.getByText('select tip rack')
    screen.getByText('mock select')
    screen.getByText(
      'Choose what tip rack you’d like to use to calibrate your tip length.'
    )
    screen.getByText('Want to use a tip rack that’s not listed here?')

    screen.getByText(
      'Opentrons tip racks are highly recommended. Accuracy cannot be guaranteed with other tip racks.'
    )
    screen.getByText('300ul Tiprack FIXTURE')
    screen.getByAltText('300ul Tiprack FIXTURE image')
    screen.getByText(
      'It’s extremely important to perform this calibration using the Opentrons tips and tip racks specified above, as the robot determines accuracy based on the known measurements of these tips.'
    )
  })

  it('renders the buttons and they work as expected', () => {
    render(props)
    screen.getByRole('link', { name: 'Need help?' })
    const cancel = screen.getByRole('button', { name: 'cancel' })
    const confirm = screen.getByRole('button', { name: 'Confirm tip rack' })
    fireEvent.click(cancel)
    expect(props.closeModal).toHaveBeenCalled()
    fireEvent.click(confirm)
    expect(props.handleChosenTipRack).toHaveBeenCalled()
  })
})
