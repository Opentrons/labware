import { describe, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ManualMoveLwAndSkip } from '../ManualMoveLwAndSkip'
import { RECOVERY_MAP } from '../../constants'

import type { ComponentProps } from 'react'

vi.mock('../../shared', () => ({
  GripperIsHoldingLabware: vi.fn(() => (
    <div>MOCK_GRIPPER_IS_HOLDING_LABWARE</div>
  )),
  GripperReleaseLabware: vi.fn(() => <div>MOCK_GRIPPER_RELEASE_LABWARE</div>),
  TwoColLwInfoAndDeck: vi.fn(() => <div>MOCK_TWO_COL_LW_INFO_AND_DECK</div>),
  SkipStepInfo: vi.fn(() => <div>MOCK_SKIP_STEP_INFO</div>),
  RecoveryDoorOpenSpecial: vi.fn(() => <div>MOCK_DOOR_OPEN_SPECIAL</div>),
}))

vi.mock('../SelectRecoveryOption', () => ({
  SelectRecoveryOption: vi.fn(() => <div>MOCK_SELECT_RECOVERY_OPTION</div>),
}))

describe('ManualMoveLwAndSkip', () => {
  let props: ComponentProps<typeof ManualMoveLwAndSkip>

  beforeEach(() => {
    props = {
      recoveryMap: {
        route: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
        step: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.GRIPPER_HOLDING_LABWARE,
      },
    } as any
  })

  const render = (props: ComponentProps<typeof ManualMoveLwAndSkip>) => {
    return renderWithProviders(<ManualMoveLwAndSkip {...props} />, {
      i18nInstance: i18n,
    })[0]
  }

  it(`renders GripperIsHoldingLabware for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.GRIPPER_HOLDING_LABWARE}`, () => {
    render(props)
    screen.getByText('MOCK_GRIPPER_IS_HOLDING_LABWARE')
  })

  it(`renders GripperReleaseLabware for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.GRIPPER_RELEASE_LABWARE} step`, () => {
    props.recoveryMap.step =
      RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.GRIPPER_RELEASE_LABWARE
    render(props)
    screen.getByText('MOCK_GRIPPER_RELEASE_LABWARE')
  })

  it(`renders RecoveryDoorOpenSpecial for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME} step`, () => {
    props.recoveryMap.step =
      RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.CLOSE_DOOR_GRIPPER_Z_HOME
    render(props)
    screen.getByText('MOCK_DOOR_OPEN_SPECIAL')
  })

  it(`renders TwoColLwInfoAndDeck for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE} step`, () => {
    props.recoveryMap.step = RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE
    render(props)
    screen.getByText('MOCK_TWO_COL_LW_INFO_AND_DECK')
  })

  it(`renders SkipStepInfo for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.SKIP} step`, () => {
    props.recoveryMap.step = RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.SKIP
    render(props)
    screen.getByText('MOCK_SKIP_STEP_INFO')
  })

  it('renders SelectRecoveryOption for unknown step', () => {
    props.recoveryMap.step = 'UNKNOWN_STEP' as any
    render(props)
    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })
})
