import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  OVERFLOW_WRAP_ANYWHERE,
  POSITION_RELATIVE,
  SPACING,
  StyledText,
  Toolbox,
} from '@opentrons/components'

import { NAV_BAR_HEIGHT_REM } from '../../../../atoms'
import {
  END_TERMINAL_ITEM_ID,
  START_TERMINAL_ITEM_ID,
  actions as steplistActions,
} from '../../../../steplist'
import { actions as stepsActions } from '../../../../ui/steps'
import { selectors as stepFormSelectors } from '../../../../step-forms'
import { getUnsavedForm } from '../../../../step-forms/selectors'
import { TerminalItemStep } from './TerminalItemStep'
import { AddStepButton } from './AddStepButton'
import { PresavedStep } from './PresavedStep'
import { DraggableSteps } from './DraggableSteps'

import type { StepIdType } from '../../../../form-types'
import type { ThunkDispatch } from '../../../../types'

const SIDEBAR_MIN_WIDTH_FOR_ICON = 179
interface TimelineToolboxProps {
  sidebarWidth: number
}

export const TimelineToolbox = ({
  sidebarWidth,
}: TimelineToolboxProps): JSX.Element => {
  const { t } = useTranslation('protocol_steps')
  const orderedStepIds = useSelector(stepFormSelectors.getOrderedStepIds)
  const formData = useSelector(getUnsavedForm)
  const dispatch = useDispatch<ThunkDispatch<any>>()

  const handleKeyDown: (e: KeyboardEvent) => void = e => {
    const { key, altKey: altIsPressed } = e

    if (altIsPressed) {
      let delta = 0
      if (key === 'ArrowUp') {
        delta = -1
      } else if (key === 'ArrowDown') {
        delta = 1
      }
      dispatch(stepsActions.reorderSelectedStep(delta))
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      handleKeyDown(e)
    }

    global.addEventListener('keydown', onKeyDown, false)

    return () => {
      global.removeEventListener('keydown', onKeyDown, false)
    }
  }, [])

  return (
    <Toolbox
      position={POSITION_RELATIVE}
      height="100%"
      maxHeight={`calc(100vh - ${NAV_BAR_HEIGHT_REM}rem - 2 * ${SPACING.spacing12})`}
      width={`${sidebarWidth / 16}rem`}
      title={
        <StyledText
          desktopStyle="bodyLargeSemiBold"
          overflowWrap={OVERFLOW_WRAP_ANYWHERE}
        >
          {t('timeline')}
        </StyledText>
      }
      titlePadding={SPACING.spacing12}
      childrenPadding={SPACING.spacing12}
      confirmButton={
        formData != null ? undefined : (
          <AddStepButton hasText={sidebarWidth > SIDEBAR_MIN_WIDTH_FOR_ICON} />
        )
      }
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        width="100%"
      >
        <TerminalItemStep
          id={START_TERMINAL_ITEM_ID}
          sidebarWidth={sidebarWidth}
        />
        <DraggableSteps
          orderedStepIds={orderedStepIds}
          reorderSteps={(stepIds: StepIdType[]) => {
            dispatch(steplistActions.reorderSteps(stepIds))
          }}
          sidebarWidth={sidebarWidth}
        />
        <PresavedStep sidebarWidth={sidebarWidth} />
        <TerminalItemStep
          id={END_TERMINAL_ITEM_ID}
          sidebarWidth={sidebarWidth}
        />
      </Flex>
    </Toolbox>
  )
}
