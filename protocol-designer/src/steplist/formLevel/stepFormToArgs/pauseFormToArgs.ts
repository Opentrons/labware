import { getTimeFromForm } from '../../utils/getTimeFromForm'
import {
  PAUSE_UNTIL_TIME,
  PAUSE_UNTIL_TEMP,
  PAUSE_UNTIL_RESUME,
} from '../../../constants'
import type { FormData } from '../../../form-types'
import type {
  WaitForTemperatureArgs,
  PauseArgs,
} from '@opentrons/step-generation'

export const pauseFormToArgs = (
  formData: FormData
): PauseArgs | WaitForTemperatureArgs | null => {
  const { hours, minutes, seconds } = getTimeFromForm(formData, 'pauseTime')
  const totalSeconds = (hours ?? 0) * 3600 + minutes * 60 + seconds
  const temperature = parseFloat(formData.pauseTemperature as string)
  const message = formData.pauseMessage ?? ''

  switch (formData.pauseAction) {
    case PAUSE_UNTIL_TEMP:
      return {
        commandCreatorFnName: 'waitForTemperature',
        temperature,
        module: formData.moduleId,
        message,
      }

    case PAUSE_UNTIL_TIME:
      return {
        commandCreatorFnName: 'delay',
        name: `Pause ${formData.id}`,
        // TODO real name for steps
        description: formData.description ?? '',
        // TODO get from form
        wait: totalSeconds,
        message,
        meta: {
          hours,
          minutes,
          seconds,
        },
      }

    case PAUSE_UNTIL_RESUME:
      return {
        commandCreatorFnName: 'delay',
        name: `Pause ${formData.id}`,
        // TODO real name for steps
        description: formData.description ?? '',
        // TODO get from form
        wait: true,
        message,
        meta: {
          hours,
          minutes,
          seconds,
        },
      }

    default:
      return null
  }
}
