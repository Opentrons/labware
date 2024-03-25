import { useTranslation } from 'react-i18next'
import { describe, it, expect, vi } from 'vitest'
import { formatRunTimeParameterValue } from '../utils'

import type { RunTimeParameter } from '@opentrons/shared-data'

const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const mockTFunction = vi.fn(str => capitalizeFirstLetter(str))

vi.mock('react-i18next', async importOriginal => {
  const actual = await importOriginal<typeof useTranslation>()
  return {
    ...actual,
    t: mockTFunction,
  }
})

describe('utils-formatRunTimeParameterValue', () => {
  it('should return value with suffix when type is int', () => {
    const mockData = {
      value: 6,
      displayName: 'PCR Cycles',
      variableName: 'PCR_CYCLES',
      description: 'number of PCR cycles on a thermocycler',
      type: 'int',
      min: 1,
      max: 10,
      default: 6,
    } as RunTimeParameter
    const result = formatRunTimeParameterValue(mockData, mockTFunction)
    expect(result).toEqual('6')
  })

  it('should return value with suffix when type is float', () => {
    const mockData = {
      value: 6.5,
      displayName: 'EtoH Volume',
      variableName: 'ETOH_VOLUME',
      description: '70% ethanol volume',
      type: 'float',
      suffix: 'mL',
      min: 1.5,
      max: 10.0,
      default: 6.5,
    } as RunTimeParameter
    const result = formatRunTimeParameterValue(mockData, mockTFunction)
    expect(result).toEqual('6.5 mL')
  })

  it('should return value with suffix when type is str', () => {
    const mockData = {
      value: 'left',
      displayName: 'pipette mount',
      variableName: 'mont',
      description: 'pipette mount',
      type: 'str',
      choices: [
        {
          displayName: 'Left',
          value: 'left',
        },
        {
          displayName: 'Right',
          value: 'right',
        },
      ],
      default: 'left',
    } as RunTimeParameter
    const result = formatRunTimeParameterValue(mockData, mockTFunction)
    expect(result).toEqual('Left')
  })

  it('should return value with suffix when type is boolean true', () => {
    const mockData = {
      value: true,
      displayName: 'Deactivate Temperatures',
      variableName: 'DEACTIVATE_TEMP',
      description: 'deactivate temperature on the module',
      type: 'boolean',
      default: true,
    } as RunTimeParameter
    const result = formatRunTimeParameterValue(mockData, mockTFunction)
    expect(result).toEqual('On')
  })

  it('should return value with suffix when type is boolean false', () => {
    const mockData = {
      value: false,
      displayName: 'Dry Run',
      variableName: 'DRYRUN',
      description: 'Is this a dry or wet run? Wet is true, dry is false',
      type: 'boolean',
      default: false,
    } as RunTimeParameter
    const result = formatRunTimeParameterValue(mockData, mockTFunction)
    expect(result).toEqual('Off')
  })
})
