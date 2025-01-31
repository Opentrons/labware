import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { GripperReleaseLabware } from '../GripperReleaseLabware'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockRecoveryContentProps } from '/app/organisms/ErrorRecoveryFlows/__fixtures__'
import { clickButtonLabeled } from '/app/organisms/ErrorRecoveryFlows/__tests__/util'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/assets/videos/error-recovery/Gripper_Release.webm', () => ({
  default: 'mocked-animation-path.webm',
}))

const render = (props: ComponentProps<typeof GripperReleaseLabware>) => {
  return renderWithProviders(<GripperReleaseLabware {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('GripperReleaseLabware', () => {
  let props: ComponentProps<typeof GripperReleaseLabware>
  let mockHandleMotionRouting: Mock

  beforeEach(() => {
    mockHandleMotionRouting = vi.fn(() => Promise.resolve())

    props = {
      ...mockRecoveryContentProps,
      routeUpdateActions: {
        handleMotionRouting: mockHandleMotionRouting,
        goBackPrevStep: vi.fn(),
      } as any,
    }
  })

  it('renders appropriate copy', () => {
    render(props)

    screen.getByText('Release labware from gripper')
    screen.getByText(
      'Take any necessary precautions before positioning yourself to stabilize or catch the labware. Once confirmed, a countdown will begin before the gripper releases.'
    )
    screen.getByText('The labware will be released from its current height.')
  })

  it('clicking the primary button has correct behavior', () => {
    render(props)

    clickButtonLabeled('Release')

    expect(mockHandleMotionRouting).toHaveBeenCalled()
  })

  it('renders gripper animation', () => {
    render(props)

    screen.getByRole('presentation', { hidden: true })
    expect(screen.getByTestId('gripper-animation')).toHaveAttribute(
      'src',
      'mocked-animation-path.webm'
    )
  })
})
