import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  FLEX_MAX_CONTENT,
  Flex,
  Icon,
  PrimaryButton,
  StyledText,
  Toolbox,
} from '@opentrons/components'
import { getSubsteps } from '../../../../file-data/selectors'
import { getHoveredSubstep } from '../../../../ui/steps'
import {
  hoverOnStep,
  hoverOnSubstep,
  toggleViewSubstep,
} from '../../../../ui/steps/actions/actions'
import { THERMOCYCLER_PROFILE } from '../../../../constants'
import { getSavedStepForms } from '../../../../step-forms/selectors'
import { PipettingSubsteps } from './PipettingSubsteps'
import { ThermocyclerProfileSubsteps } from './ThermocyclerProfileSubsteps'
import type { SubstepIdentifier } from '../../../../steplist'
import type { HoverOnSubstepAction } from '../../../../ui/steps'

interface SubStepsToolboxProps {
  stepId: string
}

export function SubStepsToolbox(
  props: SubStepsToolboxProps
): JSX.Element | null {
  const { stepId } = props
  const { t, i18n } = useTranslation([
    'application',
    'protocol_steps',
    'shared',
  ])
  const dispatch = useDispatch()
  const substeps = useSelector(getSubsteps)[stepId]
  const formData = useSelector(getSavedStepForms)[stepId]
  const hoveredSubstep = useSelector(getHoveredSubstep)
  const highlightSubstep = (payload: SubstepIdentifier): HoverOnSubstepAction =>
    dispatch(hoverOnSubstep(payload))

  if (substeps == null || formData == null) {
    return null
  }

  const handleClose = (): void => {
    dispatch(toggleViewSubstep(null))
    dispatch(hoverOnStep(null))
  }

  return ('commandCreatorFnName' in substeps &&
    (substeps.commandCreatorFnName === 'transfer' ||
      substeps.commandCreatorFnName === 'consolidate' ||
      substeps.commandCreatorFnName === 'distribute' ||
      substeps.commandCreatorFnName === 'mix')) ||
    substeps.substepType === THERMOCYCLER_PROFILE ? (
    <Toolbox
      height="calc(100vh - 6rem)"
      width={FLEX_MAX_CONTENT}
      closeButton={<Icon size="2rem" name="close" />}
      onCloseClick={handleClose}
      confirmButton={
        <PrimaryButton onClick={handleClose} width="100%">
          {t('shared:done')}
        </PrimaryButton>
      }
      title={
        <StyledText desktopStyle="bodyLargeSemiBold">
          {i18n.format(
            t(`protocol_steps:step_substeps`, {
              stepType: formData?.stepName ?? formData.stepType,
            }),
            'capitalize'
          )}
        </StyledText>
      }
    >
      <Flex>
        {substeps.substepType === THERMOCYCLER_PROFILE ? (
          <ThermocyclerProfileSubsteps key="substeps" stepId={stepId} />
        ) : (
          <PipettingSubsteps
            key="substeps"
            substeps={substeps}
            hoveredSubstep={hoveredSubstep}
            selectSubstep={highlightSubstep}
          />
        )}
      </Flex>
    </Toolbox>
  ) : null
}
