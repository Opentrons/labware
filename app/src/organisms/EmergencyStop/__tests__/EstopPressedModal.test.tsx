import { fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { useAcknowledgeEstopDisengageMutation } from '@opentrons/react-api-client'

import { i18n } from '/app/i18n'
import { getIsOnDevice } from '/app/redux/config'
import { EstopPressedModal } from '../EstopPressedModal'
import { usePlacePlateReaderLid } from '/app/resources/modules'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/config')
vi.mock('/app/resources/modules')

const render = (props: ComponentProps<typeof EstopPressedModal>) => {
  return renderWithProviders(<EstopPressedModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('EstopPressedModal - Touchscreen', () => {
  let props: ComponentProps<typeof EstopPressedModal>

  beforeEach(() => {
    props = {
      isEngaged: true,
      closeModal: vi.fn(),
      isWaitingForResumeOperation: false,
      setIsWaitingForResumeOperation: vi.fn(),
    }
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    vi.mocked(useAcknowledgeEstopDisengageMutation).mockReturnValue({
      setEstopPhysicalStatus: vi.fn(),
    } as any)

    vi.mocked(usePlacePlateReaderLid).mockReturnValue({
      handlePlaceReaderLid: vi.fn(),
      isValidPlateReaderMove: false,
      isExecuting: false,
    })
  })

  it('should render text and button', () => {
    render(props)
    screen.getByText('E-stop pressed')
    screen.getByText('E-stop')
    screen.getByText('Engaged')
    screen.getByText(
      'First, safely clear the deck of any labware or spills. Then, twist the E-stop button clockwise. Finally, have Flex move the gantry to its home position.'
    )
    screen.getByText('Resume robot operations')
    expect(screen.getByTestId('Estop_pressed_button')).toBeDisabled()
  })

  it('should resume robot operation button is not disabled', () => {
    props.isEngaged = false
    render(props)
    screen.getByText('E-stop')
    screen.getByText('Disengaged')
    screen.getByText('Resume robot operations')
    expect(screen.getByTestId('Estop_pressed_button')).not.toBeDisabled()
  })

  it('should call a mock function when clicking resume robot operations', () => {
    render(props)
    fireEvent.click(screen.getByText('Resume robot operations'))
    expect(useAcknowledgeEstopDisengageMutation).toHaveBeenCalled()
    expect(usePlacePlateReaderLid).toHaveBeenCalled()
  })

  it('should call a mock function to place the labware to a slot', () => {
    vi.mocked(usePlacePlateReaderLid).mockReturnValue({
      handlePlaceReaderLid: vi.fn(),
      isValidPlateReaderMove: true,
      isExecuting: true,
    })

    render(props)
    fireEvent.click(screen.getByText('Resume robot operations'))
    expect(useAcknowledgeEstopDisengageMutation).toHaveBeenCalled()
    expect(usePlacePlateReaderLid).toHaveBeenCalled()
  })
})

describe('EstopPressedModal - Desktop', () => {
  let props: ComponentProps<typeof EstopPressedModal>

  beforeEach(() => {
    props = {
      isEngaged: true,
      closeModal: vi.fn(),
      isWaitingForResumeOperation: false,
      setIsWaitingForResumeOperation: vi.fn(),
    }
    vi.mocked(getIsOnDevice).mockReturnValue(false)
    vi.mocked(useAcknowledgeEstopDisengageMutation).mockReturnValue({
      setEstopPhysicalStatus: vi.fn(),
    } as any)

    vi.mocked(usePlacePlateReaderLid).mockReturnValue({
      handlePlaceReaderLid: vi.fn(),
      isValidPlateReaderMove: false,
      isExecuting: false,
    })
  })
  it('should render text and button', () => {
    render(props)
    screen.getByText('E-stop pressed')
    screen.getByText('E-stop Engaged')
    screen.getByText(
      'First, safely clear the deck of any labware or spills. Then, twist the E-stop button clockwise. Finally, have Flex move the gantry to its home position.'
    )
    expect(
      screen.getByRole('button', { name: 'Resume robot operations' })
    ).toBeDisabled()
  })

  it('should resume robot operation button is not disabled', () => {
    props.isEngaged = false
    render(props)
    expect(
      screen.getByRole('button', { name: 'Resume robot operations' })
    ).not.toBeDisabled()
  })

  it('should resume robot operation button is disabled when waiting for labware plate to finish', () => {
    props.isEngaged = false
    props.isWaitingForResumeOperation = true
    render(props)
    expect(
      screen.getByRole('button', { name: 'Resume robot operations' })
    ).toBeDisabled()
  })

  it('should call a mock function when clicking close icon', () => {
    render(props)
    fireEvent.click(screen.getByTestId('ModalHeader_icon_close_E-stop pressed'))
    expect(props.closeModal).toHaveBeenCalled()
  })

  it('should call a mock function when clicking resume robot operations', () => {
    render(props)
    fireEvent.click(
      screen.getByRole('button', { name: 'Resume robot operations' })
    )
    expect(useAcknowledgeEstopDisengageMutation).toHaveBeenCalled()
  })
})
