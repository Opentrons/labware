import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import { useConditionalConfirm } from '@opentrons/components'

import {
  getHoveredTerminalItemId,
  getSelectedTerminalItemId,
  getIsMultiSelectMode,
  actions as stepsActions,
} from '../../../../ui/steps'
import {
  getCurrentFormIsPresaved,
  getCurrentFormHasUnsavedChanges,
} from '../../../../step-forms/selectors'
import { START_TERMINAL_ITEM_ID } from '../../../../steplist'
import {
  CLOSE_STEP_FORM_WITH_CHANGES,
  CLOSE_UNSAVED_STEP_FORM,
  ConfirmDeleteModal,
} from '../../../../organisms'
import {
  deselectAllSteps,
  hoverOnStep,
  toggleViewSubstep,
} from '../../../../ui/steps/actions/actions'
import { StepContainer } from './StepContainer'

import type {
  SelectTerminalItemAction,
  HoverOnTerminalItemAction,
} from '../../../../ui/steps'
import type { TerminalItemId } from '../../../../steplist'
import type { ThunkDispatch } from '../../../../types'

export interface TerminalItemStepProps {
  id: TerminalItemId
  sidebarWidth: number
}

export function TerminalItemStep(props: TerminalItemStepProps): JSX.Element {
  const { id, sidebarWidth } = props
  const { t } = useTranslation('protocol_steps')
  const hovered = useSelector(getHoveredTerminalItemId) === id
  const selected = useSelector(getSelectedTerminalItemId) === id
  const currentFormIsPresaved = useSelector(getCurrentFormIsPresaved)
  const formHasChanges = useSelector(getCurrentFormHasUnsavedChanges)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)

  const dispatch = useDispatch<ThunkDispatch<any>>()

  const selectItem = (): SelectTerminalItemAction =>
    dispatch(stepsActions.selectTerminalItem(id))
  const onMouseEnter = (): HoverOnTerminalItemAction =>
    dispatch(stepsActions.hoverOnTerminalItem(id))
  const onMouseLeave = (): HoverOnTerminalItemAction =>
    dispatch(stepsActions.hoverOnTerminalItem(null))
  const handleConfirm = (): void => {
    dispatch(toggleViewSubstep(null))
    dispatch(hoverOnStep(null))
    selectItem()
  }
  const { confirm, showConfirmation, cancel } = useConditionalConfirm(
    handleConfirm,
    currentFormIsPresaved || formHasChanges
  )

  const onClick = isMultiSelectMode
    ? () => {
        dispatch(deselectAllSteps('EXIT_BATCH_EDIT_MODE_BUTTON_PRESS'))
        handleConfirm()
      }
    : confirm

  return (
    <>
      {showConfirmation && (
        <ConfirmDeleteModal
          modalType={
            currentFormIsPresaved
              ? CLOSE_UNSAVED_STEP_FORM
              : CLOSE_STEP_FORM_WITH_CHANGES
          }
          onContinueClick={confirm}
          onCancelClick={cancel}
        />
      )}
      <StepContainer
        {...{
          stepId: `TerminalItem_${id}`,
          iconName: id === START_TERMINAL_ITEM_ID ? 'ot-start' : 'ot-end',
          hovered,
          selected,
          title:
            id === '__initial_setup__' ? t('starting_deck') : t('ending_deck'),
          onClick,
          onMouseEnter,
          onMouseLeave,
        }}
        sidebarWidth={sidebarWidth}
      />
    </>
  )
}
