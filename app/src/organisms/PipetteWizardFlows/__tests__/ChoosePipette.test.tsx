import {
  LEFT,
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest'

import { COLORS } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockAttachedPipetteInformation } from '/app/redux/pipettes/__fixtures__'
import { getIsOnDevice } from '/app/redux/config'
import { useAttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'
import { ChoosePipette } from '../ChoosePipette'
import { getIsGantryEmpty } from '../utils'

import type { ComponentProps } from 'react'

vi.mock('../utils')
vi.mock('/app/resources/instruments')
vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof ChoosePipette>) => {
  return renderWithProviders(<ChoosePipette {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ChoosePipette', () => {
  let props: ComponentProps<typeof ChoosePipette>
  beforeEach(() => {
    vi.mocked(getIsOnDevice).mockReturnValue(false)
    vi.mocked(getIsGantryEmpty).mockReturnValue(true)
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: null,
      right: null,
    })
    props = {
      proceed: vi.fn(),
      exit: vi.fn(),
      setSelectedPipette: vi.fn(),
      selectedPipette: SINGLE_MOUNT_PIPETTES,
      mount: LEFT,
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('returns the correct information, buttons work as expected', () => {
    render(props)
    screen.getByText('Attach Left Pipette')
    screen.getByText('Choose a pipette to attach')
    screen.getByText('1- or 8-Channel pipette')
    screen.getByText('96-Channel pipette')
    screen.getByAltText('1- or 8-Channel pipette')
    screen.getByAltText('96-Channel pipette')
    const singleMountPipettes = screen.getByRole('radio', {
      name: '1- or 8-Channel pipette 1- or 8-Channel pipette',
    })
    const ninetySixPipette = screen.getByRole('radio', {
      name: '96-Channel pipette 96-Channel pipette',
    })

    //  Single and 8-Channel pipettes are selected first by default
    expect(singleMountPipettes).toHaveStyle(
      `background-color: ${COLORS.blue10}`
    )
    expect(ninetySixPipette).toHaveStyle(`background-color: ${COLORS.white}`)

    //  Selecting 96-Channel called setSelectedPipette prop
    fireEvent.click(ninetySixPipette)
    expect(props.setSelectedPipette).toHaveBeenCalled()

    //  Selecting Single and 8-Channel pipettes called setSelectedPipette prop
    fireEvent.click(singleMountPipettes)
    expect(props.setSelectedPipette).toHaveBeenCalled()

    const proceedBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(proceedBtn)
    expect(props.proceed).toHaveBeenCalled()
  })

  it('returns the correct information, buttons work as expected for on device display', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByText('Attach Left Pipette')
    screen.getByText('Choose a pipette to attach')
    const singleMountPipettes = screen.getByText('1- or 8-Channel pipette')
    const ninetySixPipette = screen.getByText('96-Channel pipette')

    //  Selecting 96-Channel called setSelectedPipette prop
    fireEvent.click(ninetySixPipette)
    expect(props.setSelectedPipette).toHaveBeenCalled()

    //  Selecting Single and 8-Channel pipettes called setSelectedPipette prop
    fireEvent.click(singleMountPipettes)
    expect(props.setSelectedPipette).toHaveBeenCalled()

    const proceedBtn = screen.getByRole('button', { name: 'Continue' })
    fireEvent.click(proceedBtn)
    expect(props.proceed).toHaveBeenCalled()
  })

  it('renders exit button and clicking on it renders the exit modal, clicking on back button works', () => {
    render(props)
    const exit = screen.getByLabelText('Exit')
    fireEvent.click(exit)
    screen.getByText('Attaching Pipette progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Attaching Pipette?'
    )
    const goBack = screen.getByText('Go back')
    fireEvent.click(goBack)
    screen.getByText('Choose a pipette to attach')
  })

  it('renders exit button and clicking on it renders the exit modal, clicking on exit button works', () => {
    render(props)
    const exit = screen.getByLabelText('Exit')
    fireEvent.click(exit)
    screen.getByText('Attaching Pipette progress will be lost')
    screen.getByText(
      'Are you sure you want to exit before completing Attaching Pipette?'
    )
    const exitButton = screen.getByRole('button', { name: 'exit' })
    fireEvent.click(exitButton)
    expect(props.exit).toHaveBeenCalled()
  })

  it('renders the 96 channel pipette option selected', () => {
    props = { ...props, selectedPipette: NINETY_SIX_CHANNEL }
    render(props)
    const singleMountPipettes = screen.getByRole('radio', {
      name: '1- or 8-Channel pipette 1- or 8-Channel pipette',
    })
    const ninetySixPipette = screen.getByRole('radio', {
      name: '96-Channel pipette 96-Channel pipette',
    })
    expect(singleMountPipettes).toHaveStyle(`background-color: ${COLORS.white}`)
    expect(ninetySixPipette).toHaveStyle(`background-color: ${COLORS.blue10}`)
  })
  it('renders the correct text for the 96 channel button when there is a left pipette attached', () => {
    vi.mocked(getIsGantryEmpty).mockReturnValue(false)
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: mockAttachedPipetteInformation,
      right: null,
    })
    props = { ...props, selectedPipette: NINETY_SIX_CHANNEL }
    render(props)
    screen.getByText(
      'Detach Flex 1-Channel 1000 μL and Attach 96-Channel pipette'
    )
  })

  it('renders the correct text for the 96 channel button when there is a right pipette attached', () => {
    vi.mocked(getIsGantryEmpty).mockReturnValue(false)
    vi.mocked(useAttachedPipettesFromInstrumentsQuery).mockReturnValue({
      left: null,
      right: mockAttachedPipetteInformation,
    })
    props = { ...props, selectedPipette: NINETY_SIX_CHANNEL }
    render(props)
    screen.getByText(
      'Detach Flex 1-Channel 1000 μL and Attach 96-Channel pipette'
    )
  })
})
