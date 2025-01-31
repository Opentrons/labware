import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { useCurrentSubsystemUpdateQuery } from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { GripperWizardFlows } from '/app/organisms/GripperWizardFlows'
import { AboutGripperSlideout } from '../AboutGripperSlideout'
import { GripperCard } from '../'

import type { ComponentProps } from 'react'
import type { GripperData } from '@opentrons/api-client'

vi.mock('/app/organisms/GripperWizardFlows')
vi.mock('../AboutGripperSlideout')
vi.mock('@opentrons/react-api-client')

const render = (props: ComponentProps<typeof GripperCard>) => {
  return renderWithProviders(<GripperCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('GripperCard', () => {
  let props: ComponentProps<typeof GripperCard>
  beforeEach(() => {
    props = {
      attachedGripper: {
        instrumentModel: 'gripperV1.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          calibratedOffset: {
            last_modified: '12/2/4',
          },
        },
      } as GripperData,
      isCalibrated: true,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    vi.mocked(GripperWizardFlows).mockReturnValue(<>wizard flow launched</>)
    vi.mocked(AboutGripperSlideout).mockReturnValue(<>about gripper</>)
    vi.mocked(useCurrentSubsystemUpdateQuery).mockReturnValue({
      data: undefined,
    } as any)
  })

  it('renders correct info when gripper is attached', () => {
    render(props)
    const image = screen.getByRole('img', { name: 'Flex Gripper' })
    expect(image.getAttribute('src')).toEqual(
      '/app/src/assets/images/flex_gripper.png'
    )
    screen.getByText('extension mount')
    screen.getByText('Flex Gripper')
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    screen.getByText('Recalibrate gripper')
    screen.getByText('Detach gripper')
    screen.getByText('About gripper')
  })
  it('renders recalibrate banner when no calibration data is present', () => {
    props = props = {
      attachedGripper: {
        instrumentModel: 'gripperV1.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          calibratedOffset: {
            last_modified: undefined,
          },
        },
      } as GripperData,
      isCalibrated: false,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }

    render(props)
    screen.getByText('Calibration needed.')
    screen.getByText('Calibrate now')
  })

  it('renders recalibrate banner without calibrate now when no calibration data is present and e-stop is pressed', () => {
    props = {
      attachedGripper: {
        instrumentModel: 'gripperV1.1',
        serialNumber: '123',
        firmwareVersion: '12',
        ok: true,
        data: {
          calibratedOffset: {
            last_modified: undefined,
          },
        },
      } as GripperData,
      isCalibrated: false,
      isRunActive: false,
      isEstopNotDisengaged: true,
    }

    render(props)
    screen.getByText('Calibration needed.')
    expect(screen.queryByText('Calibrate now')).not.toBeInTheDocument()
  })

  it('opens the about gripper slideout when button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    const aboutGripperButton = screen.getByText('About gripper')
    fireEvent.click(aboutGripperButton)
    screen.getByText('about gripper')
  })
  it('renders wizard flow when recalibrate button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    const recalibrateGripperButton = screen.getByText('Recalibrate gripper')
    fireEvent.click(recalibrateGripperButton)
    screen.getByText('wizard flow launched')
  })
  it('renders wizard flow when detach button is pressed', () => {
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /InstrumentCard_overflowMenu/i,
    })
    fireEvent.click(overflowButton)
    const detachGripperButton = screen.getByText('Detach gripper')
    fireEvent.click(detachGripperButton)
    screen.getByText('wizard flow launched')
  })
  it('renders wizard flow when attach button is pressed', () => {
    props = {
      attachedGripper: null,
      isCalibrated: false,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })
    fireEvent.click(overflowButton)
    const attachGripperButton = screen.getByText('Attach gripper')
    fireEvent.click(attachGripperButton)
    screen.getByText('wizard flow launched')
  })
  it('renders firmware update needed state if gripper is bad', () => {
    props = {
      attachedGripper: {
        ok: false,
      } as any,
      isCalibrated: false,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('Extension mount')
    screen.getByText('Instrument attached')
    screen.getByText(
      `Instrument firmware update needed. Start the update on the robot's touchscreen.`
    )
  })
  it('renders firmware update in progress state if gripper is bad and update in progress', () => {
    vi.mocked(useCurrentSubsystemUpdateQuery).mockReturnValue({
      data: { data: { updateProgress: 50 } as any },
    } as any)
    props = {
      attachedGripper: {
        ok: false,
      } as any,
      isCalibrated: true,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('Extension mount')
    screen.getByText('Instrument attached')
    screen.getByText('Firmware update in progress...')
  })
})
