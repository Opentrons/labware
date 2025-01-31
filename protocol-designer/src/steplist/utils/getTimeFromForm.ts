import type { FormData } from '../../form-types'
import type { HydratedFormData } from '../formLevel/errors'

const TIME_DELIMITER = ':'

interface TimeData {
  minutes: number
  seconds: number
  hours: number
}

export const getTimeFromForm = (
  formData: FormData | HydratedFormData,
  timeField: string
): TimeData => {
  if (formData[timeField] == null) {
    return { hours: 0, minutes: 0, seconds: 0 }
  }
  const timeSplit = formData[timeField].split(TIME_DELIMITER)
  const [hoursFromForm, minutesFromForm, secondsFromForm] =
    timeSplit.length === 3 ? timeSplit : [0, ...timeSplit]

  const hours = isNaN(parseFloat(hoursFromForm as string))
    ? 0
    : parseFloat(hoursFromForm as string)
  const minutes = isNaN(parseFloat(minutesFromForm as string))
    ? 0
    : parseFloat(minutesFromForm as string)
  const seconds = isNaN(parseFloat(secondsFromForm as string))
    ? 0
    : parseFloat(secondsFromForm as string)

  return { hours, minutes, seconds }
}
