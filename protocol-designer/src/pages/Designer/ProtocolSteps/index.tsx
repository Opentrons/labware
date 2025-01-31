import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  FLEX_MAX_CONTENT,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  POSITION_FIXED,
  POSITION_RELATIVE,
  SPACING,
  StyledText,
  Tag,
  ToggleGroup,
} from '@opentrons/components'
import {
  getSavedStepForms,
  getUnsavedForm,
} from '../../../step-forms/selectors'
import { getEnableHotKeysDisplay } from '../../../feature-flags/selectors'
import {
  getIsMultiSelectMode,
  getSelectedSubstep,
  getSelectedStepId,
  getHoveredStepId,
  getSelectedTerminalItemId,
  getHoveredTerminalItemId,
} from '../../../ui/steps/selectors'
import { DeckSetupContainer } from '../DeckSetup'
import { OffDeck } from '../OffDeck'
import { SubStepsToolbox } from './Timeline'
import { StepForm } from './StepForm'
import { StepSummary } from './StepSummary'
import { BatchEditToolbox } from './BatchEditToolbox'
import {
  getDesignerTab,
  getRobotStateTimeline,
} from '../../../file-data/selectors'
import { TimelineAlerts } from '../../../organisms'
import { DraggableSidebar } from './DraggableSidebar'

const CONTENT_MAX_WIDTH = '46.9375rem'

export function ProtocolSteps(): JSX.Element {
  const { i18n, t } = useTranslation('starting_deck_state')
  const formData = useSelector(getUnsavedForm)
  const selectedTerminalItem = useSelector(getSelectedTerminalItemId)
  const hoveredTerminalItem = useSelector(getHoveredTerminalItemId)
  const isMultiSelectMode = useSelector(getIsMultiSelectMode)
  const selectedSubstep = useSelector(getSelectedSubstep)
  const enableHotKeyDisplay = useSelector(getEnableHotKeysDisplay)
  const tab = useSelector(getDesignerTab)
  const leftString = t('onDeck')
  const rightString = t('offDeck')
  const [deckView, setDeckView] = useState<
    typeof leftString | typeof rightString
  >(leftString)
  const [targetWidth, setTargetWidth] = useState<number>(350)

  const currentHoveredStepId = useSelector(getHoveredStepId)
  const currentSelectedStepId = useSelector(getSelectedStepId)
  const currentstepIdForStepSummary =
    currentHoveredStepId ?? currentSelectedStepId
  const savedStepForms = useSelector(getSavedStepForms)
  const currentStep =
    currentstepIdForStepSummary != null
      ? savedStepForms[currentstepIdForStepSummary]
      : null

  const { errors: timelineErrors } = useSelector(getRobotStateTimeline)
  const hasTimelineErrors =
    timelineErrors != null ? timelineErrors.length > 0 : false
  const showTimelineAlerts =
    hasTimelineErrors && tab === 'protocolSteps' && formData == null
  const stepDetails = currentStep?.stepDetails ?? null

  return (
    <Flex
      backgroundColor={COLORS.grey10}
      height="calc(100vh - 4rem)"
      // minHeight={FLEX_MAX_CONTENT}
      // minHeight="100%"
      width="100%"

      // gridGap={SPACING.spacing16}
    >
      <Flex height="100%" padding={SPACING.spacing12}>
        <DraggableSidebar setTargetWidth={setTargetWidth} />
      </Flex>
      <Flex
        id="main flex"
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
        flex="2.85"
        paddingTop={showTimelineAlerts ? '0' : SPACING.spacing24}
        // position={POSITION_RELATIVE}
        paddingX="1.75rem"
        height="100%"
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing24}
          // width="100%"
          width={CONTENT_MAX_WIDTH}
          id="bigger flex"
          height="100%"
          justifyContent={JUSTIFY_CENTER}
        >
          {showTimelineAlerts ? (
            <TimelineAlerts
              justifyContent={JUSTIFY_CENTER}
              width="100%"
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing4}
            />
          ) : null}
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
          >
            {currentStep != null && hoveredTerminalItem == null ? (
              <StyledText desktopStyle="headingSmallBold">
                {i18n.format(currentStep.stepName, 'capitalize')}
              </StyledText>
            ) : null}
            {(hoveredTerminalItem != null || selectedTerminalItem != null) &&
            currentHoveredStepId == null ? (
              <StyledText desktopStyle="headingSmallBold">
                {t(hoveredTerminalItem ?? selectedTerminalItem)}
              </StyledText>
            ) : null}

            <ToggleGroup
              selectedValue={deckView}
              leftText={leftString}
              rightText={rightString}
              leftClick={() => {
                setDeckView(leftString)
              }}
              rightClick={() => {
                setDeckView(rightString)
              }}
            />
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing16}
            id="container for deck setup"
          >
            {deckView === leftString ? (
              <DeckSetupContainer tab="protocolSteps" />
            ) : (
              <OffDeck tab="protocolSteps" />
            )}
            {formData == null ? (
              <StepSummary
                currentStep={currentStep}
                stepDetails={stepDetails}
              />
            ) : null}
          </Flex>
        </Flex>
        {enableHotKeyDisplay ? (
          <Flex
            position={POSITION_FIXED}
            left={`calc(1.5rem + ${targetWidth}px)`}
            bottom="0.75rem"
            gridGap={SPACING.spacing4}
            flexDirection={DIRECTION_COLUMN}
          >
            <Tag
              text={t('double_click_to_edit')}
              type="default"
              shrinkToContent
            />
            <Tag
              text={t('shift_click_to_select_range')}
              type="default"
              shrinkToContent
            />
            <Tag
              text={t('command_click_to_multi_select')}
              type="default"
              shrinkToContent
            />
          </Flex>
        ) : null}
      </Flex>
      {formData == null && selectedSubstep ? (
        <SubStepsToolbox stepId={selectedSubstep} />
      ) : null}
      <Flex padding={SPACING.spacing12}>
        <StepForm />
      </Flex>

      {isMultiSelectMode ? <BatchEditToolbox /> : null}
    </Flex>
  )
}
