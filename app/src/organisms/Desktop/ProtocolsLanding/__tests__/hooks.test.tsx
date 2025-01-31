import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { useSortedProtocols } from '../hooks'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { ProtocolAnalysisOutput } from '@opentrons/shared-data'
import type { StoredProtocolData } from '/app/redux/protocol-storage'
import type { State } from '/app/redux/types'

const mockStoredProtocolData = [
  {
    protocolKey: '26ed5a82-502f-4074-8981-57cdda1d066d',
    modified: 1651613783762.9993,
    srcFileNames: ['secondProtocol.json'],
    srcFiles: [],
    mostRecentAnalysis: {
      robotType: FLEX_ROBOT_TYPE,
      createdAt: '2022-05-03T21:36:12.494778+00:00',
      files: [
        {
          name: 'secondProtocol.json',
          role: 'main',
        },
      ],
      config: {
        protocolType: 'json',
        schemaVersion: 6,
      },
      metadata: {
        author: 'Otie',
        description: 'another mock protocol',
        created: 1606853851893,
        lastModified: 1619792954015,
        tags: [],
      },
      commands: [],
      labware: [
        {
          id: 'labware-0',
          loadName: 'opentrons_1_trash_1100ml_fixed',
          definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
          location: { slotName: '12' },
          displayName: 'Trash',
        },
        {
          id: 'labware-1',
          loadName: 'opentrons_96_tiprack_1000ul',
          definitionUri: 'opentrons/opentrons_96_tiprack_1000ul/1',
          location: { slotName: '1' },
          displayName: 'Opentrons 96 Tip Rack 1000 µL',
        },
      ],
      pipettes: [
        {
          id: 'pipette-0',
          pipetteName: 'p1000_single_gen2',
          mount: 'left',
        },
      ],
      modules: [
        {
          id: 'module-0',
          model: 'magneticModuleV2',
          location: { slotName: '6' },
          serialNumber: 'dummySerialMD',
        },
        {
          id: 'module-1',
          model: 'temperatureModuleV2',
          location: { slotName: '3' },
          serialNumber: 'dummySerialTD',
        },
        {
          id: 'module-2',
          model: 'thermocyclerModuleV1',
          location: { slotName: '7' },
          serialNumber: 'dummySerialTC',
        },
      ],
      liquids: [
        {
          id: '0',
          displayName: 'Water',
          description: 'liquid H2O',
          displayColor: '#50d5ff',
        },
        {
          id: '1',
          displayName: 'Blood',
          description: 'human essence',
          displayColor: '#ff4f4f',
        },
      ],
      runTimeParameters: [],
      errors: [],
      result: 'ok',
    } as ProtocolAnalysisOutput,
  },
  {
    protocolKey: '3dc99ffa-f85e-4c01-ab0a-edecff432dac',
    modified: 1652339310312.1985,
    srcFileNames: ['testProtocol.json'],
    srcFiles: [],
    mostRecentAnalysis: {
      robotType: OT2_ROBOT_TYPE,
      createdAt: '2022-05-10T17:04:43.132768+00:00',
      files: [
        {
          name: 'testProtocol.json',
          role: 'main',
        },
      ],
      config: {
        protocolType: 'json',
        schemaVersion: 6,
      },
      metadata: {
        protocolName: 'Third protocol',
        author: 'engineering',
        description: 'A short mock protocol',
        created: 1223131231,
        tags: ['unitTest'],
      },
      commands: [],
      labware: [
        {
          id: 'labware-0',
          loadName: 'opentrons_1_trash_1100ml_fixed',
          definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
          location: { slotName: '12' },
          displayName: 'Trash',
        },
        {
          id: 'labware-1',
          loadName: 'opentrons_96_tiprack_1000ul',
          definitionUri: 'opentrons/opentrons_96_tiprack_1000ul/1',
          location: { slotName: '1' },
          displayName: 'Opentrons 96 Tip Rack 1000 µL',
        },
      ],
      pipettes: [
        {
          id: 'pipette-0',
          pipetteName: 'p1000_single_gen2',
          mount: 'left',
        },
      ],
      modules: [
        {
          id: 'module-0',
          model: 'magneticModuleV2',
          location: { slotName: '6' },
          serialNumber: 'dummySerialMD',
        },
        {
          id: 'module-1',
          model: 'temperatureModuleV2',
          location: { slotName: '3' },
          serialNumber: 'dummySerialTD',
        },
        {
          id: 'module-2',
          model: 'thermocyclerModuleV1',
          location: { slotName: '7' },
          serialNumber: 'dummySerialTC',
        },
      ],
      liquids: [
        {
          id: '0',
          displayName: 'Water',
          description: 'liquid H2O',
          displayColor: '#50d5ff',
        },
        {
          id: '1',
          displayName: 'Blood',
          description: 'human essence',
          displayColor: '#ff4f4f',
        },
      ],
      runTimeParameters: [],
      errors: [],
      result: 'ok',
    } as ProtocolAnalysisOutput,
  },
  {
    protocolKey: 'f130337e-68ad-4b5d-a6d2-cbc20515b1f7',
    modified: 1651688428961.8438,
    srcFileNames: ['demo.py'],
    srcFiles: [],
    mostRecentAnalysis: {
      createdAt: '2022-05-04T18:20:21.526508+00:00',
      files: [
        {
          name: 'demo.py',
          role: 'main',
        },
      ],
      config: {
        protocolType: 'python',
        apiVersion: [2, 10],
      },
      metadata: {
        protocolName: 'First protocol',
        author: 'Otie',
        source: 'Custom Protocol Request',
        apiLevel: '2.10',
      },
      commands: [],
      labware: [
        {
          id: 'labware-0',
          loadName: 'opentrons_1_trash_1100ml_fixed',
          definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
          location: { slotName: '12' },
          displayName: 'Trash',
        },
        {
          id: 'labware-1',
          loadName: 'opentrons_96_tiprack_1000ul',
          definitionUri: 'opentrons/opentrons_96_tiprack_1000ul/1',
          location: { slotName: '1' },
          displayName: 'Opentrons 96 Tip Rack 1000 µL',
        },
      ],
      pipettes: [
        {
          id: 'pipette-0',
          pipetteName: 'p1000_single_gen2',
          mount: 'left',
        },
      ],
      modules: [
        {
          id: 'module-0',
          model: 'magneticModuleV2',
          location: {
            slotName: '6',
          },
          serialNumber: 'dummySerialMD',
        },
        {
          id: 'module-1',
          model: 'temperatureModuleV2',
          location: {
            slotName: '3',
          },
          serialNumber: 'dummySerialTD',
        },
        {
          id: 'module-2',
          model: 'thermocyclerModuleV1',
          location: {
            slotName: '7',
          },
          serialNumber: 'dummySerialTC',
        },
      ],
      liquids: [
        {
          id: '0',
          displayName: 'Water',
          description: 'liquid H2O',
          displayColor: '#50d5ff',
        },
        {
          id: '1',
          displayName: 'Blood',
          description: 'human essence',
          displayColor: '#ff4f4f',
        },
      ],
      runTimeParameters: [],
      errors: [],
      result: 'ok',
    } as ProtocolAnalysisOutput,
  },
] as StoredProtocolData[]

describe('useSortedProtocols', () => {
  const store: Store<State> = createStore(vi.fn(), {})
  beforeEach(() => {
    store.dispatch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return an object with protocols sorted alphabetically', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useSortedProtocols('alphabetical', mockStoredProtocolData),
      { wrapper }
    )
    const firstProtocol = result.current[0]
    const secondProtocol = result.current[1]
    const thirdProtocol = result.current[2]

    expect(firstProtocol.protocolKey).toBe(
      'f130337e-68ad-4b5d-a6d2-cbc20515b1f7'
    )
    expect(secondProtocol.protocolKey).toBe(
      '26ed5a82-502f-4074-8981-57cdda1d066d'
    )
    expect(thirdProtocol.protocolKey).toBe(
      '3dc99ffa-f85e-4c01-ab0a-edecff432dac'
    )
  })

  it('should return an object with protocols sorted reverse alphabetically', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useSortedProtocols('reverse', mockStoredProtocolData),
      { wrapper }
    )
    const firstProtocol = result.current[0]
    const secondProtocol = result.current[1]
    const thirdProtocol = result.current[2]

    expect(firstProtocol.protocolKey).toBe(
      '3dc99ffa-f85e-4c01-ab0a-edecff432dac'
    )
    expect(secondProtocol.protocolKey).toBe(
      '26ed5a82-502f-4074-8981-57cdda1d066d'
    )
    expect(thirdProtocol.protocolKey).toBe(
      'f130337e-68ad-4b5d-a6d2-cbc20515b1f7'
    )
  })

  it('should return an object with protocols sorted by most recent modified data', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useSortedProtocols('recent', mockStoredProtocolData),
      { wrapper }
    )
    const firstProtocol = result.current[0]
    const secondProtocol = result.current[1]
    const thirdProtocol = result.current[2]

    expect(firstProtocol.protocolKey).toBe(
      '3dc99ffa-f85e-4c01-ab0a-edecff432dac'
    )
    expect(secondProtocol.protocolKey).toBe(
      'f130337e-68ad-4b5d-a6d2-cbc20515b1f7'
    )
    expect(thirdProtocol.protocolKey).toBe(
      '26ed5a82-502f-4074-8981-57cdda1d066d'
    )
  })

  it('should return an object with protocols sorted by oldest modified data', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useSortedProtocols('oldest', mockStoredProtocolData),
      { wrapper }
    )
    const firstProtocol = result.current[0]
    const secondProtocol = result.current[1]
    const thirdProtocol = result.current[2]

    expect(firstProtocol.protocolKey).toBe(
      '26ed5a82-502f-4074-8981-57cdda1d066d'
    )
    expect(secondProtocol.protocolKey).toBe(
      'f130337e-68ad-4b5d-a6d2-cbc20515b1f7'
    )
    expect(thirdProtocol.protocolKey).toBe(
      '3dc99ffa-f85e-4c01-ab0a-edecff432dac'
    )
  })

  it('should return an object with protocols sorted by flex then ot-2', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useSortedProtocols('flex', mockStoredProtocolData),
      { wrapper }
    )
    const firstProtocol = result.current[0]
    const secondProtocol = result.current[1]
    const thirdProtocol = result.current[2]

    expect(firstProtocol.protocolKey).toBe(
      '26ed5a82-502f-4074-8981-57cdda1d066d'
    )
    expect(secondProtocol.protocolKey).toBe(
      '3dc99ffa-f85e-4c01-ab0a-edecff432dac'
    )
    expect(thirdProtocol.protocolKey).toBe(
      'f130337e-68ad-4b5d-a6d2-cbc20515b1f7'
    )
  })
  it('should return an object with protocols sorted by ot-2 then flex', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>

    const { result } = renderHook(
      () => useSortedProtocols('ot2', mockStoredProtocolData),
      { wrapper }
    )
    const firstProtocol = result.current[0]
    const secondProtocol = result.current[1]
    const thirdProtocol = result.current[2]

    expect(firstProtocol.protocolKey).toBe(
      '3dc99ffa-f85e-4c01-ab0a-edecff432dac'
    )
    expect(secondProtocol.protocolKey).toBe(
      'f130337e-68ad-4b5d-a6d2-cbc20515b1f7'
    )
    expect(thirdProtocol.protocolKey).toBe(
      '26ed5a82-502f-4074-8981-57cdda1d066d'
    )
  })
})
