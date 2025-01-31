import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useAllLabware } from '/app/local-resources/labware'
import { mockOpentronsLabwareDetailsDefinition } from '/app/redux/custom-labware/__fixtures__'
import { CustomLabwareOverflowMenu } from '../../LabwareCard/CustomLabwareOverflowMenu'
import { Dimensions } from '../Dimensions'
import { Gallery } from '../Gallery'
import { ManufacturerDetails } from '../ManufacturerDetails'
import { WellCount } from '../WellCount'
import { WellProperties } from '../WellProperties'
import { WellDimensions } from '../WellDimensions'
import { WellSpacing } from '../WellSpacing'

import { LabwareDetails } from '..'

import type { ComponentProps } from 'react'

vi.mock('/app/local-resources/labware')
vi.mock('../../LabwareCard/CustomLabwareOverflowMenu')
vi.mock('../Dimensions')
vi.mock('../Gallery')
vi.mock('../ManufacturerDetails')
vi.mock('../WellProperties')
vi.mock('../WellCount')
vi.mock('../WellDimensions')
vi.mock('../WellSpacing')

const render = (
  props: ComponentProps<typeof LabwareDetails>
): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<LabwareDetails {...props} />, {
    i18nInstance: i18n,
  })
}

describe('LabwareDetails', () => {
  let props: ComponentProps<typeof LabwareDetails>
  beforeEach(() => {
    vi.mocked(CustomLabwareOverflowMenu).mockReturnValue(
      <div>Mock CustomLabwareOverflowMenu</div>
    )
    vi.mocked(useAllLabware).mockReturnValue([
      { definition: mockOpentronsLabwareDetailsDefinition },
    ])
    vi.mocked(Dimensions).mockReturnValue(<div>Mock Dimensions</div>)
    vi.mocked(Gallery).mockReturnValue(<div>Mock Gallery</div>)
    vi.mocked(ManufacturerDetails).mockReturnValue(
      <div>Mock ManufacturerDetails</div>
    )
    vi.mocked(WellCount).mockReturnValue(<div>Mock WellCount</div>)
    vi.mocked(WellProperties).mockReturnValue(<div>Mock WellProperties</div>)
    vi.mocked(WellDimensions).mockReturnValue(<div>Mock WellDimensions</div>)
    vi.mocked(WellSpacing).mockReturnValue(<div>Mock WellSpacing</div>)

    props = {
      labware: {
        definition: mockOpentronsLabwareDetailsDefinition,
      },
      onClose: vi.fn(),
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })
  it('should render correct info for opentrons labware', () => {
    render(props)
    screen.getByText('Mock Definition')
    screen.getByText('Opentrons Definition')
    screen.getByText('API Name')
    screen.getByText('mock_definition')
    screen.getByText('Mock Dimensions')
    screen.getByText('Mock Gallery')
    screen.getByText('Mock ManufacturerDetails')
    screen.getByText('Mock WellCount')
    screen.getByText('Mock WellProperties')
    screen.getByText('Mock WellDimensions')
    screen.getByText('Mock WellSpacing')
  })

  it('should no render Mock Well Dimensions, if a labware does not have groupMetaData', () => {
    props.labware.definition.groups = []
    render(props)
    expect(screen.queryByText('Mock WellDimensions')).not.toBeInTheDocument()
  })

  it('should render correct info for custom labware', () => {
    props.labware.definition.namespace = 'custom'
    render(props)
    expect(screen.queryByText('Opentrons Definition')).not.toBeInTheDocument()
  })

  it.todo('when clicking copy icon, should show tooltip as feedback')
  // NOTE: popper updates internally async so item is not visible,
  // it might be worth mocking it's implementation
  //
  // , async () => {
  //   const user = userEvent.setup()
  //   render(props)
  //   const button = screen.getByRole('button', { name: 'copy' })
  //   user.click(button)
  //   await waitFor(() => {
  //     expect(screen.queryByText(/Copied!/i)).not.toBeNull()
  //   })
  // })

  it('should close the slideout when clicking the close button', () => {
    render(props)
    const closeButton = screen.getByTestId(
      'labwareDetails_slideout_close_button'
    )
    fireEvent.click(closeButton)
    expect(props.onClose).toHaveBeenCalled()
  })
})
