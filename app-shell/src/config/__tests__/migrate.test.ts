// config migration tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import uuid from 'uuid/v4'

import {
  MOCK_CONFIG_V0,
  MOCK_CONFIG_V1,
  MOCK_CONFIG_V2,
  MOCK_CONFIG_V3,
  MOCK_CONFIG_V4,
  MOCK_CONFIG_V5,
  MOCK_CONFIG_V6,
  MOCK_CONFIG_V7,
  MOCK_CONFIG_V8,
  MOCK_CONFIG_V9,
  MOCK_CONFIG_V10,
  MOCK_CONFIG_V11,
  MOCK_CONFIG_V12,
  MOCK_CONFIG_V13,
  MOCK_CONFIG_V14,
  MOCK_CONFIG_V15,
  MOCK_CONFIG_V16,
  MOCK_CONFIG_V17,
  MOCK_CONFIG_V18,
  MOCK_CONFIG_V19,
  MOCK_CONFIG_V20,
  MOCK_CONFIG_V21,
  MOCK_CONFIG_V22,
  MOCK_CONFIG_V23,
  MOCK_CONFIG_V24,
  MOCK_CONFIG_V25,
  MOCK_CONFIG_V26,
} from '../../__fixtures__'
import { migrate } from '../migrate'

vi.mock('uuid/v4')

const NEWEST_VERSION = 26
const NEWEST_MOCK_CONFIG = MOCK_CONFIG_V26

describe('config migration', () => {
  beforeEach(() => {
    vi.mocked(uuid).mockReturnValue('MOCK_UUIDv4')
  })

  it('should migrate version 0 to latest', () => {
    const v0Config = MOCK_CONFIG_V0
    const result = migrate(v0Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 1 to latest', () => {
    const v1Config = MOCK_CONFIG_V1
    const result = migrate(v1Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 2 to latest', () => {
    const v2Config = MOCK_CONFIG_V2
    const result = migrate(v2Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 3 to latest', () => {
    const v3Config = MOCK_CONFIG_V3
    const result = migrate(v3Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 4 to latest', () => {
    const v4Config = MOCK_CONFIG_V4
    const result = migrate(v4Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 5 to latest', () => {
    const v5Config = MOCK_CONFIG_V5
    const result = migrate(v5Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 6 to latest', () => {
    const v6Config = MOCK_CONFIG_V6
    const result = migrate(v6Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 7 to latest', () => {
    const v7Config = MOCK_CONFIG_V7
    const result = migrate(v7Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 8 to latest', () => {
    const v8Config = MOCK_CONFIG_V8
    const result = migrate(v8Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 9 to latest', () => {
    const v9Config = MOCK_CONFIG_V9
    const result = migrate(v9Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 10 to latest', () => {
    const v10Config = MOCK_CONFIG_V10
    const result = migrate(v10Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 11 to latest', () => {
    const v11Config = MOCK_CONFIG_V11
    const result = migrate(v11Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 12 to latest', () => {
    const v12Config = MOCK_CONFIG_V12
    const result = migrate(v12Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 13 to latest', () => {
    const v13Config = MOCK_CONFIG_V13
    const result = migrate(v13Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 14 to latest', () => {
    const v14Config = MOCK_CONFIG_V14
    const result = migrate(v14Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 15 to latest', () => {
    const v15Config = MOCK_CONFIG_V15
    const result = migrate(v15Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 16 to latest', () => {
    const v16Config = MOCK_CONFIG_V16
    const result = migrate(v16Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })

  it('should migrate version 17 to latest', () => {
    const v17Config = MOCK_CONFIG_V17
    const result = migrate(v17Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migrate version 18 to latest', () => {
    const v18Config = MOCK_CONFIG_V18
    const result = migrate(v18Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should keep migrate version 19 to latest', () => {
    const v19Config = MOCK_CONFIG_V19
    const result = migrate(v19Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migration version 20 to latest', () => {
    const v20Config = MOCK_CONFIG_V20
    const result = migrate(v20Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migration version 21 to latest', () => {
    const v21Config = MOCK_CONFIG_V21
    const result = migrate(v21Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migration version 22 to latest', () => {
    const v22Config = MOCK_CONFIG_V22
    const result = migrate(v22Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migrate version 23 to latest', () => {
    const v23Config = MOCK_CONFIG_V23
    const result = migrate(v23Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migrate version 24 to latest', () => {
    const v24Config = MOCK_CONFIG_V24
    const result = migrate(v24Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should migrate version 25 to latest', () => {
    const v25Config = MOCK_CONFIG_V25
    const result = migrate(v25Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
  it('should keep version 26', () => {
    const v26Config = MOCK_CONFIG_V26
    const result = migrate(v26Config)

    expect(result.version).toBe(NEWEST_VERSION)
    expect(result).toEqual(NEWEST_MOCK_CONFIG)
  })
})
