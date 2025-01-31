import { describe, it, expect } from 'vitest'
import {
  PAUSE_UNTIL_TEMP,
  PAUSE_UNTIL_RESUME,
  PAUSE_UNTIL_TIME,
} from '../../../../constants'
import { pauseFormToArgs } from '../pauseFormToArgs'
import type { FormData } from '../../../../form-types'

describe('pauseFormToArgs', () => {
  it('returns waitForTemperature command creator when form specifies pause until temp', () => {
    const formData: FormData = {
      stepType: 'pause',
      id: 'test_id',
      pauseAction: PAUSE_UNTIL_TEMP,
      pauseTemperature: '20',
      pauseMessage: 'pause message',
      moduleId: 'some_id',
      pauseTime: null,
    }
    const expected = {
      commandCreatorFnName: 'waitForTemperature',
      temperature: 20,
      message: 'pause message',
      module: 'some_id',
    }
    expect(pauseFormToArgs(formData)).toEqual(expected)
  })
  it('returns delay command creator when form specifies pause until resume', () => {
    const formData: FormData = {
      stepType: 'pause',
      id: 'test_id',
      pauseAction: PAUSE_UNTIL_RESUME,
      description: 'some description',
      pauseMessage: 'some message',
    }
    const expected = {
      commandCreatorFnName: 'delay',
      name: `Pause ${formData.id}`,
      description: 'some description',
      wait: true,
      message: 'some message',
      meta: {
        hours: 0,
        minutes: 0,
        seconds: 0,
      },
    }
    expect(pauseFormToArgs(formData)).toEqual(expected)
  })

  it('returns delay command creator when form specifies pause until time', () => {
    const formData: FormData = {
      stepType: 'pause',
      id: 'test_id',
      pauseAction: PAUSE_UNTIL_TIME,
      description: 'some description',
      pauseMessage: 'some message',
      pauseTime: '01:20:05',
    }
    const expected = {
      commandCreatorFnName: 'delay',
      name: `Pause ${formData.id}`,
      description: 'some description',
      wait: 3600 + 20 * 60 + 5,
      message: 'some message',
      meta: {
        hours: 1,
        minutes: 20,
        seconds: 5,
      },
    }
    expect(pauseFormToArgs(formData)).toEqual(expected)
  })
})
