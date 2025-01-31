import { useDispatch, useSelector } from 'react-redux'

import { useTranslation } from 'react-i18next'
import { useConditionalConfirm } from '@opentrons/components'
import * as timelineWarningSelectors from '../../../../top-selectors/timelineWarnings'
import { selectors as dismissSelectors } from '../../../../dismiss'
import { selectors as stepFormSelectors } from '../../../../step-forms'
import {
  actions as stepsActions,
  getHoveredStepId,
  getHoveredSubstep,
  getMultiSelectItemIds,
  getSelectedStepId,
  getMultiSelectLastSelected,
  getIsMultiSelectMode,
} from '../../../../ui/steps'
import { selectors as fileDataSelectors } from '../../../../file-data'
import {
  CLOSE_STEP_FORM_WITH_CHANGES,
  CLOSE_UNSAVED_STEP_FORM,
  ConfirmDeleteModal,
} from '../../../../organisms'
import { stepIconsByType } from '../../../../form-types'
import {
  hoverOnStep,
  toggleViewSubstep,
} from '../../../../ui/steps/actions/actions'
import { getOrderedStepIds } from '../../../../step-forms/selectors'
import { StepContainer } from './StepContainer'
import {
  getMetaSelectedSteps,
  getMouseClickKeyInfo,
  getShiftSelectedSteps,
  nonePressed,
} from './utils'

import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import type { ThunkDispatch } from 'redux-thunk'
import type {
  HoverOnStepAction,
  SelectMultipleStepsAction,
} from '../../../../ui/steps'
import type { StepIdType } from '../../../../form-types'
import type { BaseState, ThunkAction } from '../../../../types'
import type { DeleteModalType } from '../../../../organisms'

export interface ConnectedStepInfoProps {
  stepId: StepIdType
  stepNumber: number
  dragHovered?: boolean
  openedOverflowMenuId?: string | null
  setOpenedOverflowMenuId?: Dispatch<SetStateAction<string | null>>
  sidebarWidth: number
}

export function ConnectedStepInfo(props: ConnectedStepInfoProps): JSX.Element {
  const {
    stepId,
    stepNumber,
    dragHovered = false,
    openedOverflowMenuId,
    setOpenedOverflowMenuId,
    sidebarWidth,
  } = props
  const { t } = useTranslation('application')
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const stepIds = useSelector(getOrderedStepIds)
  const step = useSelector(stepFormSelectors.getSavedStepForms)[stepId]
  const argsAndErrors = useSelector(stepFormSelectors.getArgsAndErrorsByStepId)[
    stepId
  ]
  const selectedStep = useSelector(getSelectedStepId)
  const errorStepId = useSelector(fileDataSelectors.getErrorStepId)
  const hasError = errorStepId === stepId || argsAndErrors.errors != null
  const hasTimelineWarningsPerStep = useSelector(
    timelineWarningSelectors.getHasTimelineWarningsPerStep
  )
  const hasFormLevelWarningsPerStep = useSelector(
    dismissSelectors.getHasFormLevelWarningsPerStep
  )
  const stepListAfterErrors =
    errorStepId != null ? stepIds.slice(stepIds.indexOf(errorStepId) + 1) : []
  const stepAfterError =
    stepId != null ? stepListAfterErrors.includes(stepId) : false

  const hasWarnings =
    hasTimelineWarningsPerStep[stepId] || hasFormLevelWarningsPerStep[stepId]
  const hoveredSubstep = useSelector(getHoveredSubstep)
  const hoveredStep = useSelector(getHoveredStepId)
  const selectedStepId = useSelector(getSelectedStepId)
  const multiSelectItemIds = useSelector(getMultiSelectItemIds)
  const orderedStepIds = useSelector(stepFormSelectors.getOrderedStepIds)
  const lastMultiSelectedStepId = useSelector(getMultiSelectLastSelected)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)
  const selected: boolean = multiSelectItemIds?.length
    ? multiSelectItemIds.includes(stepId)
    : selectedStepId === stepId
  const currentFormIsPresaved = useSelector(
    stepFormSelectors.getCurrentFormIsPresaved
  )
  const singleEditFormHasUnsavedChanges = useSelector(
    stepFormSelectors.getCurrentFormHasUnsavedChanges
  )
  const batchEditFormHasUnsavedChanges = useSelector(
    stepFormSelectors.getBatchEditFormHasUnsavedChanges
  )
  const selectMultipleSteps = (
    steps: StepIdType[],
    lastSelected: StepIdType
  ): ThunkAction<SelectMultipleStepsAction> =>
    dispatch(stepsActions.selectMultipleSteps(steps, lastSelected))

  const selectStep = (): ThunkAction<any> =>
    dispatch(stepsActions.resetSelectStep(stepId))
  const selectStepOnDoubleClick = (): ThunkAction<any> =>
    dispatch(stepsActions.selectStep(stepId))
  const highlightStep = (): HoverOnStepAction =>
    dispatch(stepsActions.hoverOnStep(stepId))
  const unhighlightStep = (): HoverOnStepAction =>
    dispatch(stepsActions.hoverOnStep(null))
  const handleSelectStep = (event: MouseEvent): void => {
    if (selectedStep !== stepId) {
      dispatch(toggleViewSubstep(null))
      dispatch(hoverOnStep(null))
    }
    const { isShiftKeyPressed, isMetaKeyPressed } = getMouseClickKeyInfo(event)
    let stepsToSelect: StepIdType[] = []

    // if user clicked on the last multi-selected step, shift/meta keys don't matter
    const toggledLastSelected = stepId === lastMultiSelectedStepId
    const noModifierKeys =
      nonePressed([isShiftKeyPressed, isMetaKeyPressed]) || toggledLastSelected

    if (noModifierKeys) {
      selectStep()
    } else if (
      (isMetaKeyPressed || isShiftKeyPressed) &&
      currentFormIsPresaved
    ) {
      // current form is presaved, enter batch edit mode with only the clicked
      stepsToSelect = [stepId]
    } else {
      if (isShiftKeyPressed) {
        stepsToSelect = getShiftSelectedSteps(
          selectedStepId,
          orderedStepIds,
          stepId,
          multiSelectItemIds,
          lastMultiSelectedStepId
        )
      } else if (isMetaKeyPressed) {
        stepsToSelect = getMetaSelectedSteps(
          multiSelectItemIds,
          stepId,
          selectedStepId
        )
      }
    }
    if (stepsToSelect.length > 0) {
      selectMultipleSteps(stepsToSelect, stepId)
    }
  }
  const handleSelectDoubleStep = (): void => {
    selectStepOnDoubleClick()

    if (selectedStep !== stepId) {
      dispatch(toggleViewSubstep(null))
      dispatch(hoverOnStep(null))
    }
  }

  const {
    confirm: confirmDoubleClick,
    showConfirmation: showConfirmationDoubleClick,
    cancel: cancelDoubleClick,
  } = useConditionalConfirm(
    handleSelectDoubleStep,
    currentFormIsPresaved || singleEditFormHasUnsavedChanges
  )

  const { confirm, showConfirmation, cancel } = useConditionalConfirm(
    handleSelectStep,
    isMultiSelectMode
      ? batchEditFormHasUnsavedChanges
      : currentFormIsPresaved || singleEditFormHasUnsavedChanges
  )

  const getModalType = (): DeleteModalType => {
    if (currentFormIsPresaved) {
      return CLOSE_UNSAVED_STEP_FORM
    } else {
      return CLOSE_STEP_FORM_WITH_CHANGES
    }
  }

  const iconName = stepIconsByType[step.stepType]

  return (
    <>
      {/* TODO: update this modal */}
      {showConfirmationDoubleClick && (
        <ConfirmDeleteModal
          modalType={getModalType()}
          onContinueClick={confirmDoubleClick}
          onCancelClick={cancelDoubleClick}
        />
      )}
      {/* TODO: update this modal */}
      {showConfirmation && (
        <ConfirmDeleteModal
          modalType={getModalType()}
          onContinueClick={confirm}
          onCancelClick={cancel}
        />
      )}
      <StepContainer
        openedOverflowMenuId={openedOverflowMenuId}
        setOpenedOverflowMenuId={setOpenedOverflowMenuId}
        hasError={hasError}
        isStepAfterError={stepAfterError}
        stepId={stepId}
        onMouseLeave={unhighlightStep}
        selected={selected}
        onDoubleClick={confirmDoubleClick}
        onClick={confirm}
        hovered={hoveredStep === stepId && !hoveredSubstep}
        onMouseEnter={highlightStep}
        iconName={hasError || hasWarnings ? 'alert-circle' : iconName}
        title={`${stepNumber}. ${
          step.stepName || t(`stepType.${step.stepType}`)
        }`}
        dragHovered={dragHovered}
        sidebarWidth={sidebarWidth}
      />
    </>
  )
}
