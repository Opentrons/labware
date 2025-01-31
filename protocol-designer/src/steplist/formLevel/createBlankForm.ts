import { getDefaultsForStepType } from './getDefaultsForStepType'
import type {
  StepType,
  StepIdType,
  BlankForm,
  FormData,
} from '../../form-types'
interface NewFormArgs {
  stepId: StepIdType
  stepType: StepType
}

//  TODO(jr, 1/17/24): add to i18n
const getStepType = (stepType: StepType): string => {
  switch (stepType) {
    case 'heaterShaker': {
      return 'heater-shaker'
    }
    case 'moveLabware': {
      return 'move'
    }
    case 'moveLiquid': {
      return 'transfer'
    }
    default: {
      return stepType
    }
  }
}

// Add default values to a new step form
export function createBlankForm(args: NewFormArgs): FormData {
  const { stepId, stepType } = args
  const baseForm: BlankForm = {
    id: stepId,
    stepType: stepType,
    stepName: getStepType(stepType),
    stepDetails: '',
  }
  return { ...baseForm, ...getDefaultsForStepType(stepType) }
}
