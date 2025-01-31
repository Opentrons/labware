import { when } from 'vitest-when'
import { describe, it, beforeEach, vi, afterEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useInstrumentsQuery } from '@opentrons/react-api-client'
import { ProtocolRunModuleControls } from '../ProtocolRunModuleControls'
import { ModuleCard } from '/app/organisms/ModuleCard'
import { useModuleRenderInfoForProtocolById } from '/app/resources/runs'
import {
  mockMagneticModuleGen2,
  mockTemperatureModuleGen2,
  mockThermocycler,
  mockHeaterShaker,
} from '/app/redux/modules/__fixtures__'

import type { ComponentProps } from 'react'
import type { ModuleModel, ModuleType } from '@opentrons/shared-data'

vi.mock('@opentrons/react-api-client')
vi.mock('/app/organisms/ModuleCard')
vi.mock('/app/resources/runs')

const RUN_ID = 'test123'
const mockTempMod = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'temperature_id',
  model: 'temperatureModuleV2' as ModuleModel,
  type: 'temperatureModuleType' as ModuleType,
}
const mockMagMod = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'magmod_id',
  model: 'magneticModuleV2' as ModuleModel,
  type: 'magneticModuleType' as ModuleType,
}
const mockHeaterShakerDef = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'heatershaker_id',
  model: 'heaterShakerModuleV1' as ModuleModel,
  type: 'heaterShakerModuleType' as ModuleType,
}

const mockTCModule = {
  labwareOffset: { x: 3, y: 3, z: 3 },
  moduleId: 'thermocycler_id',
  model: 'thermocyclerModuleV1' as ModuleModel,
  type: 'thermocyclerModuleType' as ModuleType,
}
const MOCK_TC_COORDS = [20, 30, 0]

const render = (props: ComponentProps<typeof ProtocolRunModuleControls>) => {
  return renderWithProviders(<ProtocolRunModuleControls {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolRunModuleControls', () => {
  beforeEach(() => {
    vi.mocked(useInstrumentsQuery).mockReturnValue({
      data: { data: [] },
    } as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders a magnetic module card', () => {
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith(RUN_ID, true)
      .thenReturn({
        [mockMagMod.moduleId]: {
          moduleId: 'magModModuleId',
          x: '0',
          y: '20',
          z: '30',
          moduleDef: mockMagMod,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          protocolLoadOrder: 1,
          attachedModuleMatch: mockMagneticModuleGen2,
        },
      } as any)
    vi.mocked(ModuleCard).mockReturnValue(<div>mock Magnetic Module Card</div>)
    render({
      robotName: 'otie',
      runId: 'test123',
    })

    screen.getByText('mock Magnetic Module Card')
  })

  it('renders a temperature module card', () => {
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith(RUN_ID, true)
      .thenReturn({
        [mockTempMod.moduleId]: {
          moduleId: 'temperatureModuleId',
          x: '0',
          y: '20',
          z: '30',
          moduleDef: mockTempMod,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          protocolLoadOrder: 1,
          attachedModuleMatch: mockTemperatureModuleGen2,
        },
      } as any)
    vi.mocked(ModuleCard).mockReturnValue(
      <div>mock Temperature Module Card</div>
    )
    render({
      robotName: 'otie',
      runId: 'test123',
    })

    screen.getByText('mock Temperature Module Card')
  })

  it('renders a thermocycler module card', () => {
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith(RUN_ID, true)
      .thenReturn({
        [mockTCModule.moduleId]: {
          moduleId: mockTCModule.moduleId,
          x: MOCK_TC_COORDS[0],
          y: MOCK_TC_COORDS[1],
          z: MOCK_TC_COORDS[2],
          moduleDef: mockTCModule,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          protocolLoadOrder: 1,
          attachedModuleMatch: mockThermocycler,
        },
      } as any)

    vi.mocked(ModuleCard).mockReturnValue(
      <div>mock Thermocycler Module Card</div>
    )

    render({
      robotName: 'otie',
      runId: 'test123',
    })

    screen.getByText('mock Thermocycler Module Card')
  })

  it('renders a heater-shaker module card', () => {
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith(RUN_ID, true)
      .thenReturn({
        [mockHeaterShakerDef.moduleId]: {
          moduleId: 'heaterShakerModuleId',
          x: '0',
          y: '20',
          z: '30',
          moduleDef: mockHeaterShakerDef,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          protocolLoadOrder: 1,
          attachedModuleMatch: mockHeaterShaker,
        },
      } as any)
    vi.mocked(ModuleCard).mockReturnValue(
      <div>mock Heater-Shaker Module Card</div>
    )

    render({
      robotName: 'otie',
      runId: 'test123',
    })

    screen.getByText('mock Heater-Shaker Module Card')
  })

  it('renders correct text when module is not attached but required for protocol', () => {
    when(vi.mocked(useModuleRenderInfoForProtocolById))
      .calledWith(RUN_ID, true)
      .thenReturn({
        [mockHeaterShakerDef.moduleId]: {
          moduleId: 'heaterShakerModuleId',
          x: '0',
          y: '20',
          z: '30',
          moduleDef: mockHeaterShakerDef,
          nestedLabwareDef: null,
          nestedLabwareId: null,
          protocolLoadOrder: 1,
          attachedModuleMatch: null,
        },
      } as any)

    render({
      robotName: 'otie',
      runId: 'test123',
    })

    screen.getByText('Connect modules to see controls')
  })
})
