import { Provider } from 'react-redux'
import { when } from 'vitest-when'
import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import { heater_shaker_commands_with_results_key } from '@opentrons/shared-data'

import { i18n } from '/app/i18n'
import {
  mockHeaterShaker,
  mockMagneticModuleGen2,
  mockTemperatureModuleGen2,
  mockThermocycler,
  mockThermocyclerGen2,
} from '/app/redux/modules/__fixtures__'
import { useIsRobotBusy } from '/app/redux-resources/robots'

import {
  useCurrentRunId,
  useMostRecentCompletedAnalysis,
  useRunStatuses,
} from '/app/resources/runs'
import {
  useLatchControls,
  useModuleOverflowMenu,
  useIsHeaterShakerInProtocol,
} from '../hooks'

import type { FunctionComponent, ReactNode } from 'react'
import type { Store } from 'redux'
import type { State } from '/app/redux/types'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/resources/runs')
vi.mock('/app/redux-resources/robots')

const mockCloseLatchHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_closed',
    speedStatus: 'idle',
    temperatureStatus: 'idle',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'idle',
  },
  usbPort: { path: '/dev/ot_module_heatershaker0', port: 1, hub: null },
} as any

const mockHeatHeaterShaker = {
  id: 'heatershaker_id',
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  serialNumber: 'jkl123',
  hardwareRevision: 'heatershaker_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    labwareLatchStatus: 'idle_open',
    speedStatus: 'idle',
    temperatureStatus: 'holding at target',
    currentSpeed: null,
    currentTemperature: null,
    targetSpeed: null,
    targetTemp: null,
    errorDetails: null,
    status: 'heating',
  },
  usbPort: { hub: 1, port: 1, path: '/dev/ot_module_heatershaker0' },
} as any

const mockMagDeckEngaged = {
  id: 'magdeck_id',
  moduleType: 'magneticModuleType',
  moduleModel: 'magneticModuleV1',
  serialNumber: 'def456',
  hardwareRevision: 'mag_deck_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    engaged: false,
    height: 42,
    status: 'engaged',
  },
  usbPort: { hub: 1, port: 1, path: '/dev/ot_module_heatershaker0' },
} as any

const mockTemperatureModuleHeating = {
  id: 'tempdeck_id',
  moduleModel: 'temperatureModuleV2',
  moduleType: 'temperatureModuleType',
  serialNumber: 'abc123',
  hardwareRevision: 'temp_deck_v20.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    currentTemperature: 25,
    targetTemperature: null,
    status: 'heating',
  },
  usbPort: { hub: 1, port: 1, path: '/dev/ot_module_tempdeck0' },
} as any

const mockTCBlockHeating = {
  id: 'thermocycler_id',
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  serialNumber: 'ghi789',
  hardwareRevision: 'thermocycler_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    lid: 'open',
    lidTargetTemperature: null,
    lidTemperature: null,
    currentTemperature: null,
    targetTemperature: 45,
    holdTime: null,
    rampRate: null,
    currentCycleIndex: null,
    totalCycleCount: null,
    currentStepIndex: null,
    totalStepCount: null,
    status: 'heating',
  },
  usbPort: { hub: 1, port: 1, path: '/dev/ot_module_thermocycler0' },
} as any

const mockTCLidHeating = {
  id: 'thermocycler_id',
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  serialNumber: 'ghi789',
  hardwareRevision: 'thermocycler_v4.0',
  firmwareVersion: 'v2.0.0',
  hasAvailableUpdate: true,
  data: {
    lid: 'open',
    lidTargetTemperature: 50,
    lidTemperature: 40,
    currentTemperature: null,
    targetTemperature: null,
    holdTime: null,
    rampRate: null,
    currentCycleIndex: null,
    totalCycleCount: null,
    currentStepIndex: null,
    totalStepCount: null,
    status: 'heating',
  },
  usbPort: { hub: 1, port: 1, path: '/dev/ot_module_thermocycler0' },
} as any

describe('useLatchControls', () => {
  const store: Store<any> = createStore(vi.fn(), {})
  let mockCreateLiveCommand = vi.fn()

  beforeEach(() => {
    store.dispatch = vi.fn()
    mockCreateLiveCommand = vi.fn()
    mockCreateLiveCommand.mockResolvedValue(null)
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: false,
      isRunStill: false,
      isRunIdle: false,
      isRunTerminal: false,
    })
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
    vi.mocked(useIsRobotBusy).mockReturnValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return latch is open and handle latch function and command to close latch', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(() => useLatchControls(mockHeaterShaker), {
      wrapper,
    })
    const { isLatchClosed } = result.current

    expect(isLatchClosed).toBe(false)
    act(() => result.current.toggleLatch())
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/closeLabwareLatch',
        params: {
          moduleId: mockHeaterShaker.id,
        },
      },
    })
  })
  it('should return if latch is closed and handle latch function opens latch', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () => useLatchControls(mockCloseLatchHeaterShaker),
      {
        wrapper,
      }
    )
    const { isLatchClosed } = result.current

    expect(isLatchClosed).toBe(true)
    act(() => result.current.toggleLatch())
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/openLabwareLatch',
        params: {
          moduleId: mockCloseLatchHeaterShaker.id,
        },
      },
    })
  })
})

describe('useModuleOverflowMenu', () => {
  const store: Store<any> = createStore(vi.fn(), {})
  let mockCreateLiveCommand = vi.fn()

  beforeEach(() => {
    store.dispatch = vi.fn()
    mockCreateLiveCommand = vi.fn()
    mockCreateLiveCommand.mockResolvedValue(null)
    vi.mocked(useRunStatuses).mockReturnValue({
      isRunRunning: false,
      isRunStill: true,
      isRunTerminal: false,
      isRunIdle: false,
    })
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return everything for menuItemsByModuleType and create deactive heater command', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockHeatHeaterShaker,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const heaterShakerMenu =
      menuOverflowItemsByModuleType.heaterShakerModuleType

    act(() => heaterShakerMenu[0].onClick(false))
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/deactivateHeater',
        params: {
          moduleId: mockHeatHeaterShaker.id,
        },
      },
    })
  })
  it('should render heater shaker module and calls handleClick when module is idle and calls other handles when button is selected', () => {
    const mockHandleSlideoutClick = vi.fn()
    const mockAboutClick = vi.fn()
    const mockTestShakeClick = vi.fn()
    const mockHandleWizard = vi.fn()
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockHeaterShaker,
          mockAboutClick,
          mockTestShakeClick,
          mockHandleWizard,
          mockHandleSlideoutClick,
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const heaterShakerMenu =
      menuOverflowItemsByModuleType.heaterShakerModuleType

    act(() => heaterShakerMenu[0].onClick(true))
    expect(mockHandleSlideoutClick).toHaveBeenCalled()
  })

  it('should return only 1 menu button when module is a magnetic module and calls handleClick when module is disengaged', () => {
    const mockHandleClick = vi.fn()
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockMagneticModuleGen2,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          mockHandleClick,
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const magMenu = menuOverflowItemsByModuleType.magneticModuleType

    act(() => magMenu[0].onClick(false))
    expect(mockHandleClick).toHaveBeenCalled()
  })

  it('should render magnetic module and create disengage command', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockMagDeckEngaged,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const magMenu = menuOverflowItemsByModuleType.magneticModuleType

    act(() => magMenu[0].onClick(false))
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'magneticModule/disengage',
        params: {
          moduleId: mockMagDeckEngaged.id,
        },
      },
    })
  })

  it('should render temperature module and call handleClick when module is idle', () => {
    const mockHandleClick = vi.fn()
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockTemperatureModuleGen2,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          mockHandleClick,
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const tempMenu = menuOverflowItemsByModuleType.temperatureModuleType
    act(() => tempMenu[0].onClick(false))
    expect(mockHandleClick).toHaveBeenCalled()
  })

  it('should render temp module and create deactivate temp command', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockTemperatureModuleHeating,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const tempMenu = menuOverflowItemsByModuleType.temperatureModuleType
    act(() => tempMenu[0].onClick(false))
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'temperatureModule/deactivate',
        params: {
          moduleId: mockTemperatureModuleHeating.id,
        },
      },
    })
  })

  it('should render TC module and call handleClick when module is idle', () => {
    const mockHandleClick = vi.fn()
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockThermocycler,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          mockHandleClick,
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const tcMenu = menuOverflowItemsByModuleType.thermocyclerModuleType
    act(() => tcMenu[0].onClick(false))
    expect(mockHandleClick).toHaveBeenCalled()
  })

  it('should render TC module and create open lid command', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockTCBlockHeating,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const tcMenu = menuOverflowItemsByModuleType.thermocyclerModuleType
    const openLidButton = tcMenu[1]
    act(() => openLidButton.onClick(true))

    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'thermocycler/openLid',
        params: {
          moduleId: mockTCBlockHeating.id,
        },
      },
    })
  })

  it('should render TC module and create deactivate lid command', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockTCLidHeating,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const tcMenu = menuOverflowItemsByModuleType.thermocyclerModuleType
    const lidTempButton = tcMenu[0]
    act(() => lidTempButton.onClick(true))

    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'thermocycler/deactivateLid',
        params: {
          moduleId: mockTCLidHeating.id,
        },
      },
    })
  })

  it('should render TC module gen 2 and create a close lid command', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => (
      <I18nextProvider i18n={i18n}>
        <Provider store={store}>{children}</Provider>
      </I18nextProvider>
    )
    const { result } = renderHook(
      () =>
        useModuleOverflowMenu(
          mockThermocyclerGen2,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
          false,
          false
        ),
      {
        wrapper,
      }
    )
    const { menuOverflowItemsByModuleType } = result.current
    const tcMenu = menuOverflowItemsByModuleType.thermocyclerModuleType
    const lidOpenButton = tcMenu[1]
    act(() => lidOpenButton.onClick(true))

    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'thermocycler/closeLid',
        params: {
          moduleId: mockThermocyclerGen2.id,
        },
      },
    })
  })
})

describe('useIsHeaterShakerInProtocol', () => {
  const store: Store<State> = createStore(vi.fn(), {})

  beforeEach(() => {
    when(useCurrentRunId).calledWith().thenReturn('1')
    store.dispatch = vi.fn()

    when(useMostRecentCompletedAnalysis)
      .calledWith('1')
      .thenReturn({
        ...heater_shaker_commands_with_results_key,
        modules: [
          {
            id: 'fake_module_id',
            model: 'heaterShakerModuleV1',
            location: {
              slotName: '1',
            },
            serialNumber: 'fake_serial',
          },
        ],
        labware: Object.keys(
          heater_shaker_commands_with_results_key.labware
        ).map(id => ({
          location: 'offDeck',
          loadName: id,
          definitionUrui: id,
          id,
        })),
      } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return true when a heater shaker is in the protocol', () => {
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>
    const { result } = renderHook(useIsHeaterShakerInProtocol, { wrapper })
    const isHeaterShakerInProtocol = result.current

    expect(isHeaterShakerInProtocol).toBe(true)
  })

  it('should return false when a heater shaker is NOT in the protocol', () => {
    when(useMostRecentCompletedAnalysis)
      .calledWith('1')
      .thenReturn({
        ...heater_shaker_commands_with_results_key,
        modules: [],
        labware: Object.keys(
          heater_shaker_commands_with_results_key.labware
        ).map(id => ({
          location: 'offDeck',
          loadName: id,
          definitionUrui: id,
          id,
        })),
      } as any)
    const wrapper: FunctionComponent<{ children: ReactNode }> = ({
      children,
    }) => <Provider store={store}>{children}</Provider>
    const { result } = renderHook(useIsHeaterShakerInProtocol, { wrapper })
    const isHeaterShakerInProtocol = result.current

    expect(isHeaterShakerInProtocol).toBe(false)
  })
})
