import { describe, it, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'

import { BaseDeck } from '@opentrons/components'
import {
  FLEX_SIMPLEST_DECK_CONFIG_PROTOCOL_SPEC,
  getSimplestDeckConfigForProtocol,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { ModulesAndDeckMapView } from '../ModulesAndDeckMapView'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/components/src/hardware-sim/BaseDeck')
vi.mock('@opentrons/api-client')
vi.mock('@opentrons/shared-data/js/helpers/getSimplestFlexDeckConfig')
vi.mock('/app/redux/config')
vi.mock('/app/resources/deck_configuration/utils')
vi.mock('/app/molecules/ModuleInfo')
vi.mock('/app/transformations/analysis')

const mockRunId = 'mockRunId'
const PROTOCOL_ANALYSIS = {
  id: 'fake analysis',
  status: 'completed',
  labware: [],
} as any

const mockAttachedProtocolModuleMatches = [
  {
    moduleId: 'mockModuleId',
    x: 328,
    y: 107,
    z: 0,
    moduleDef: {
      $otSharedSchema: 'module/schemas/3',
      moduleType: 'magneticBlockType',
      model: 'magneticBlockV1',
      labwareOffset: {
        x: 0,
        y: 0,
        z: 38,
      },
      dimensions: {
        bareOverallHeight: 45,
        overLabwareHeight: 0,
        xDimension: 136,
        yDimension: 94,
        footprintXDimension: 127.75,
        footprintYDimension: 85.75,
        labwareInterfaceXDimension: 128,
        labwareInterfaceYDimension: 86,
      },
      cornerOffsetFromSlot: {
        x: -4.125,
        y: -4.125,
        z: 0,
      },
      calibrationPoint: {
        x: 0,
        y: 0,
        z: 0,
      },
      config: {},
      gripperOffsets: {},
      displayName: 'Magnetic Block GEN1',
      quirks: [],
      slotTransforms: {
        ot2_standard: {},
        ot2_short_trash: {},
        ot3_standard: {},
      },
      compatibleWith: [],
      twoDimensionalRendering: {},
    },
    nestedLabwareDef: null,
    nestedLabwareDisplayName: null,
    nestedLabwareId: null,
    protocolLoadOrder: 0,
    slotName: 'C3',
    attachedModuleMatch: null,
  },
] as any

vi.mock('@opentrons/shared-data', async importOriginal => {
  const actual = await importOriginal<typeof getSimplestDeckConfigForProtocol>()
  return {
    ...actual,
    getSimplestDeckConfigForProtocol: vi.fn(),
  }
})

vi.mock('@opentrons/components', async importOriginal => {
  const actual = await importOriginal<typeof BaseDeck>()
  return {
    ...actual,
    BaseDeck: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof ModulesAndDeckMapView>) => {
  return renderWithProviders(<ModulesAndDeckMapView {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ModulesAndDeckMapView', () => {
  let props: ComponentProps<typeof ModulesAndDeckMapView>

  beforeEach(() => {
    props = {
      attachedProtocolModuleMatches: mockAttachedProtocolModuleMatches,
      runId: mockRunId,
      protocolAnalysis: PROTOCOL_ANALYSIS,
    }
    vi.mocked(getSimplestDeckConfigForProtocol).mockReturnValue(
      FLEX_SIMPLEST_DECK_CONFIG_PROTOCOL_SPEC
    )
    vi.mocked(BaseDeck).mockReturnValue(<div>mock BaseDeck</div>)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render BaseDeck map view', () => {
    render(props)
    screen.getByText('mock BaseDeck')
  })
})
