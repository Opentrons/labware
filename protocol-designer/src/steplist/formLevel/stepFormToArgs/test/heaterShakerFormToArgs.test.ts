import { it, describe, expect } from 'vitest'
import { heaterShakerFormToArgs } from '../heaterShakerFormToArgs'
import type { HydratedHeaterShakerFormData } from '../../../../form-types'

describe('heaterShakerFormToArgs', () => {
  it('returns heater shaker command creator when temp, shaking, and timer is specified', () => {
    const formData: HydratedHeaterShakerFormData = {
      stepType: 'heaterShaker',
      id: 'id',
      stepDetails: 'step details',
      moduleId: 'moduleId',
      heaterShakerSetTimer: true,
      setHeaterShakerTemperature: true,
      setShake: true,
      latchOpen: false,
      targetHeaterShakerTemperature: '40',
      targetSpeed: '400',
      heaterShakerTimer: '1:10',
    }

    const expected = {
      commandCreatorFnName: 'heaterShaker',
      module: 'moduleId',
      targetTemperature: 40,
      rpm: 400,
      latchOpen: false,
      timerMinutes: 1,
      timerSeconds: 10,
    }
    expect(heaterShakerFormToArgs(formData)).toEqual(expected)
  })
  it('return heater shaker command creator when only temp is specified', () => {
    const formData: HydratedHeaterShakerFormData = {
      stepType: 'heaterShaker',
      id: 'id',
      stepDetails: 'step details',
      moduleId: 'moduleId',
      heaterShakerSetTimer: false,
      setHeaterShakerTemperature: true,
      setShake: false,
      latchOpen: false,
      targetHeaterShakerTemperature: '40',
      targetSpeed: null,
      heaterShakerTimer: null,
    }

    const expected = {
      commandCreatorFnName: 'heaterShaker',
      module: 'moduleId',
      targetTemperature: 40,
      rpm: null,
      latchOpen: false,
      timerMinutes: null,
      timerSeconds: null,
    }
    expect(heaterShakerFormToArgs(formData)).toEqual(expected)
  })
})
