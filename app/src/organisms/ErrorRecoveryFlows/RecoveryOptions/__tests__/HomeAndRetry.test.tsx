import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'

import { mockRecoveryContentProps } from '../../__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { RECOVERY_MAP } from '../../constants'
import { SelectRecoveryOption } from '../SelectRecoveryOption'
import { HomeAndRetry } from '../HomeAndRetry'
import { TipSelection } from '../../shared/TipSelection'

import type { ComponentProps } from 'react'

vi.mock('../SelectRecoveryOption')
vi.mock('../../shared/TipSelection')

const render = (props: ComponentProps<typeof HomeAndRetry>) => {
  return renderWithProviders(<HomeAndRetry {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HomeAndRetry', () => {
  let props: ComponentProps<typeof HomeAndRetry>
  beforeEach(() => {
    props = {
      ...mockRecoveryContentProps,
      currentRecoveryOptionUtils: {
        ...mockRecoveryContentProps.currentRecoveryOptionUtils,
        selectedRecoveryOption: RECOVERY_MAP.HOME_AND_RETRY.ROUTE,
      },
    }
    vi.mocked(SelectRecoveryOption).mockReturnValue(
      <div>MOCK_SELECT_RECOVERY_OPTION</div>
    )
    vi.mocked(TipSelection).mockReturnValue(<div>WELL_SELECTION</div>)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it(`renders PrepareDeckForHome when step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.PREPARE_DECK_FOR_HOME}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.PREPARE_DECK_FOR_HOME,
      },
    }
    render(props)
    screen.getByText('Prepare deck for homing')
  })
  it(`renders ManageTips when step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.REMOVE_TIPS_FROM_PIPETTE}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.REMOVE_TIPS_FROM_PIPETTE,
      },
      tipStatusUtils: {
        ...props.tipStatusUtils,
        aPipetteWithTip: {
          mount: 'left',
        } as any,
      },
    }
    render(props)
    screen.getByText('Remove any attached tips')
  })
  it(`renders labware info when step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.REPLACE_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.REPLACE_TIPS,
      },
      failedLabwareUtils: {
        ...props.failedLabwareUtils,
        relevantWellName: 'A2',
        failedLabwareLocations: {
          ...props.failedLabwareUtils.failedLabwareLocations,
          displayNameCurrentLoc: 'B2',
        },
      },
    }

    render(props)
    screen.getByText('Replace used tips in rack location A2 in B2')
  })
  it(`renders SelectTips when step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.SELECT_TIPS}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.SELECT_TIPS,
      },
      failedLabwareUtils: {
        ...props.failedLabwareUtils,
        failedLabwareLocations: {
          ...props.failedLabwareUtils.failedLabwareLocations,
          displayNameCurrentLoc: 'B2',
        },
      },
    }
    render(props)
    screen.getByText('Select tip pick-up location')
  })
  it(`renders HomeGantryBeforeRetry when step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.HOME_BEFORE_RETRY}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.HOME_BEFORE_RETRY,
      },
    }
    render(props)
    screen.getByText('Home gantry')
  })
  it(`renders the special door open handler when step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.CLOSE_DOOR_AND_HOME}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.CLOSE_DOOR_AND_HOME,
      },
      doorStatusUtils: {
        ...props.doorStatusUtils,
        isDoorOpen: true,
      },
    }
    render(props)
    screen.getByText('Close the robot door')
  })
  it(`renders RetryAfterHome awhen step is ${RECOVERY_MAP.HOME_AND_RETRY.STEPS.CONFIRM_RETRY}`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: RECOVERY_MAP.HOME_AND_RETRY.STEPS.CONFIRM_RETRY,
      },
    }
    render(props)
    screen.getByText('Retry step')
  })
  it(`renders SelectRecoveryOption as a fallback`, () => {
    props = {
      ...props,
      recoveryMap: {
        ...props.recoveryMap,
        step: 'UNKNOWN_STEP' as any,
      },
    }
    render(props)
    screen.getByText('MOCK_SELECT_RECOVERY_OPTION')
  })
})
