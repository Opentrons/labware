import { when } from 'vitest-when'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { renderWithProviders } from '/app/__testing-utils__'
import { LEFT, RIGHT } from '@opentrons/shared-data'
import { usePipetteSettingsQuery } from '@opentrons/react-api-client'
import { i18n } from '/app/i18n'
import { getHasCalibrationBlock } from '/app/redux/config'
import { useDispatchApiRequest } from '/app/redux/robot-api'
import { PipetteOverflowMenu } from '../PipetteOverflowMenu'
import { PipetteCard } from '..'
import { useDropTipWizardFlows } from '/app/organisms/DropTipWizardFlows'

import { mockLeftSpecs, mockRightSpecs } from '/app/redux/pipettes/__fixtures__'

import type { ComponentProps } from 'react'
import type { DispatchApiRequestType } from '/app/redux/robot-api'

vi.mock('../PipetteOverflowMenu')
vi.mock('/app/redux/config')
vi.mock('/app/redux/robot-api')
vi.mock('@opentrons/react-api-client')
vi.mock('/app/redux/pipettes')
vi.mock('/app/organisms/DropTipWizardFlows')

const render = (props: ComponentProps<typeof PipetteCard>) => {
  return renderWithProviders(<PipetteCard {...props} />, {
    i18nInstance: i18n,
  })[0]
}

const mockRobotName = 'mockRobotName'
describe('PipetteCard', () => {
  let dispatchApiRequest: DispatchApiRequestType
  let props: ComponentProps<typeof PipetteCard>

  beforeEach(() => {
    dispatchApiRequest = vi.fn()
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      mount: LEFT,
      robotName: mockRobotName,
      pipetteId: 'id',
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    vi.mocked(PipetteOverflowMenu).mockReturnValue(
      <div>mock pipette overflow menu</div>
    )
    vi.mocked(getHasCalibrationBlock).mockReturnValue(null)
    vi.mocked(useDispatchApiRequest).mockReturnValue([
      dispatchApiRequest,
      ['id'],
    ])
    vi.mocked(useDropTipWizardFlows).mockReturnValue({
      showDTWiz: false,
      enableDTWiz: vi.fn(),
      disableDTWiz: vi.fn(),
    })
    when(usePipetteSettingsQuery)
      .calledWith({ refetchInterval: 5000, enabled: true })
      .thenReturn({} as any)
  })

  it('renders information for a left pipette', () => {
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      mount: LEFT,
      robotName: mockRobotName,
      pipetteId: 'id',
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('left Mount')
    screen.getByText('Left Pipette')
  })

  it('renders information for a right pipette', () => {
    props = {
      pipetteModelSpecs: mockRightSpecs,
      mount: RIGHT,
      robotName: mockRobotName,
      pipetteId: 'id',
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('right Mount')
    screen.getByText('Right Pipette')
  })
  it('renders information for no pipette on right Mount', () => {
    props = {
      pipetteModelSpecs: null,
      mount: RIGHT,
      robotName: mockRobotName,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('right Mount')
    screen.getByText('Empty')
  })
  it('renders information for no pipette on left Mount', () => {
    props = {
      pipetteModelSpecs: null,
      mount: LEFT,
      robotName: mockRobotName,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    screen.getByText('left Mount')
    screen.getByText('Empty')
  })
  it('does not render banner to calibrate for ot2 pipette if not calibrated', () => {
    props = {
      pipetteModelSpecs: mockLeftSpecs,
      mount: LEFT,
      robotName: mockRobotName,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)
    expect(screen.queryByText('Calibrate now')).toBeNull()
  })
  it('renders kebab icon, opens and closes overflow menu on click', () => {
    props = {
      pipetteModelSpecs: mockRightSpecs,
      mount: RIGHT,
      robotName: mockRobotName,
      isRunActive: false,
      isEstopNotDisengaged: false,
    }
    render(props)

    const overflowButton = screen.getByRole('button', {
      name: /overflow/i,
    })

    fireEvent.click(overflowButton)
    expect(overflowButton).not.toBeDisabled()
    const overflowMenu = screen.getByText('mock pipette overflow menu')
    fireEvent.click(overflowMenu)
    expect(screen.queryByText('mock pipette overflow menu')).toBeNull()
  })
  it('does not render a pipette settings slideout card if the pipette has no settings', () => {
    render(props)
    expect(
      screen.queryByTestId(
        `PipetteSettingsSlideout_${mockRobotName}_${props.pipetteId}`
      )
    ).not.toBeInTheDocument()
  })
})
