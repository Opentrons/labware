import assert from 'assert'
import { HeaterShakerArgs } from '@opentrons/step-generation'
import type { HydratedHeaterShakerFormData } from '../../../form-types'

export const heaterShakerFormToArgs = (
  formData: HydratedHeaterShakerFormData
): HeaterShakerArgs => {
  const { moduleId, setTemperature, targetHeaterShakerTemperature, targetSpeed, setSpeed } = formData
  assert(
    setTemperature ? !Number.isNaN(targetHeaterShakerTemperature) : true,
    'heaterShakerFormToArgs expected targetTemp to be a number when setTemp is true'
  )
  assert(
    setSpeed ? !Number.isNaN(targetSpeed) : true,
    'heaterShakerFormToArgs expected targeShake to be a number when setSpeed is true'
  )

  const targetTemperature = setTemperature === 'true' && targetHeaterShakerTemperature != null ? parseFloat(targetHeaterShakerTemperature) : null
  const targetShake = setSpeed === 'true' && targetSpeed ? parseFloat(targetSpeed) : null


  return {
    commandCreatorFnName: 'heaterShaker',
    module: moduleId,
    targetTemperature: targetTemperature,
    rpm: targetShake,
    latchOpen: formData.latchOpen === 'true' ? true : false,
    timerMinutes:
      formData.heaterShakerTimerMinutes != null ? parseInt(formData.heaterShakerTimerMinutes) : null,
    timerSeconds:
      formData.heaterShakerTimerSeconds != null ? parseInt(formData.heaterShakerTimerSeconds) : null,
  }
}
