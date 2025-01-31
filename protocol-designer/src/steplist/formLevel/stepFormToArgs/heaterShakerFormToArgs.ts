import { getTimeFromForm } from '../../utils/getTimeFromForm'
import type { HeaterShakerArgs } from '@opentrons/step-generation'
import type { HydratedHeaterShakerFormData } from '../../../form-types'

export const heaterShakerFormToArgs = (
  formData: HydratedHeaterShakerFormData
): HeaterShakerArgs => {
  const {
    moduleId,
    setHeaterShakerTemperature,
    targetHeaterShakerTemperature,
    targetSpeed,
    setShake,
    latchOpen,
  } = formData
  console.assert(
    setHeaterShakerTemperature
      ? !Number.isNaN(targetHeaterShakerTemperature)
      : true,
    'heaterShakerFormToArgs expected targetTemp to be a number when setTemp is true'
  )
  console.assert(
    setShake ? !Number.isNaN(targetSpeed) : true,
    'heaterShakerFormToArgs expected targeShake to be a number when setShake is true'
  )
  const { minutes, seconds } = getTimeFromForm(formData, 'heaterShakerTimer')

  const isNullTime = minutes === 0 && seconds === 0

  const targetTemperature =
    setHeaterShakerTemperature && targetHeaterShakerTemperature != null
      ? parseFloat(targetHeaterShakerTemperature)
      : null
  const targetShake =
    setShake && targetSpeed != null ? parseFloat(targetSpeed) : null

  return {
    commandCreatorFnName: 'heaterShaker',
    module: moduleId,
    targetTemperature: targetTemperature,
    rpm: targetShake,
    latchOpen: latchOpen,
    timerMinutes: isNullTime ? null : minutes,
    timerSeconds: isNullTime ? null : seconds,
  }
}
