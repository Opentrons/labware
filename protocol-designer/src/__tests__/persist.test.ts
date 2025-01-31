import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import type { MockInstance } from 'vitest'

import * as persist from '../persist'

describe('persist', () => {
  let getItemSpy: MockInstance<(key: string) => string | null>
  let setItemSpy: MockInstance<(key: string, value: string) => void>

  beforeEach(() => {
    const LocalStorageProto = Object.getPrototypeOf(global.localStorage)
    getItemSpy = vi.spyOn(LocalStorageProto, 'getItem') as MockInstance<
      (key: string) => string | null
    >
    setItemSpy = vi.spyOn(LocalStorageProto, 'setItem')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('getLocalStorageItem', () => {
    it('retrieves localStorage data by key and parses data when it exists', () => {
      const value = { test: 'some value' }

      localStorage.setItem('root.key', JSON.stringify(value))

      const result = persist.getLocalStorageItem('key')

      expect(result).toEqual(value)
    })

    it('returns undefined when localStorage key does not exist', () => {
      const result = persist.getLocalStorageItem('not-a-key')

      expect(result).toBeUndefined()
    })

    it('returns undefined when localStorage access throws', () => {
      getItemSpy.mockImplementationOnce(() => {
        throw new Error('something went wrong!')
      })

      const result = persist.getLocalStorageItem('key')

      expect(result).toBeUndefined()
    })
  })

  describe('setLocalStorageItem', () => {
    it('adds prefix to key sets localStorage item by key', () => {
      const value = { a: 'a', b: 'b' }

      persist.setLocalStorageItem('key', value)
      expect(localStorage.getItem('root.key')).toBe(JSON.stringify(value))
    })

    it('catches errors from setItem', () => {
      setItemSpy.mockImplementationOnce(() => {
        throw new Error('something went wrong!')
      })

      expect(() => {
        persist.setLocalStorageItem('key', { value: true })
      }).not.toThrow()
    })
  })
})
