import { fireEvent, screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'

import {
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_V1,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'

import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { CheckItem } from '../CheckItem'
import { SECTIONS } from '../constants'
import { mockCompletedAnalysis, mockExistingOffsets } from '../__fixtures__'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/redux/config')
vi.mock('../../Desktop/Devices/hooks')

const mockStartPosition = { x: 10, y: 20, z: 30 }
const mockEndPosition = { x: 9, y: 19, z: 29 }

const render = (props: ComponentProps<typeof CheckItem>) => {
  return renderWithProviders(<CheckItem {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('CheckItem', () => {
  let props: ComponentProps<typeof CheckItem>
  let mockChainRunCommands: Mock

  beforeEach(() => {
    mockChainRunCommands = vi.fn().mockImplementation(() => Promise.resolve([]))
    props = {
      section: SECTIONS.CHECK_LABWARE,
      pipetteId: mockCompletedAnalysis.pipettes[0].id,
      labwareId: mockCompletedAnalysis.labware[0].id,
      definitionUri: mockCompletedAnalysis.labware[0].definitionUri,
      location: { slotName: 'D1' },
      protocolData: mockCompletedAnalysis,
      proceed: vi.fn(),
      chainRunCommands: mockChainRunCommands,
      handleJog: vi.fn(),
      registerPosition: vi.fn(),
      setFatalError: vi.fn(),
      workingOffsets: [],
      existingOffsets: mockExistingOffsets,
      isRobotMoving: false,
      robotType: FLEX_ROBOT_TYPE,
      shouldUseMetalProbe: false,
    }
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('renders correct copy when preparing space with tip rack', () => {
    render(props)
    screen.getByRole('heading', { name: 'Prepare tip rack in Slot D1' })
    screen.getByText(
      'Clear all deck slots of labware, leaving modules in place'
    )
    screen.getAllByText(/Place/i)
    screen.getAllByText(/a full Mock TipRack Definition/i)
    screen.getAllByText(/into/i)
    screen.getAllByText(/Slot D1/i)
    screen.getByRole('link', { name: 'Need help?' })
    screen.getByRole('button', { name: 'Confirm placement' })
  })
  it('renders correct copy when preparing space with non tip rack labware', () => {
    props = {
      ...props,
      labwareId: mockCompletedAnalysis.labware[1].id,
      location: { slotName: 'D2' },
    }

    render(props)
    screen.getByRole('heading', { name: 'Prepare labware in Slot D2' })
    screen.getByText(
      'Clear all deck slots of labware, leaving modules in place'
    )
    screen.getAllByText(/Place a/i)
    screen.getAllByText(/Mock Labware Definition/i)
    screen.getAllByText(/into/i)
    screen.getAllByText(/Slot D2/i)
    screen.getByRole('link', { name: 'Need help?' })
    screen.getByRole('button', { name: 'Confirm placement' })
  })
  it('executes correct chained commands when confirm placement CTA is clicked then go back', async () => {
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {},
        {},
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
      ])
    )
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await new Promise((resolve, reject) => setTimeout(resolve))
    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: { slotName: 'D1' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 44.5 } },
          },
        },
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'initialPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1' },
      position: mockStartPosition,
    })
  })
  it('executes correct chained commands when confirm placement CTA is clicked then go back on OT-2', async () => {
    props = {
      ...props,
      robotType: OT2_ROBOT_TYPE,
      location: { slotName: '1' },
    }
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {},
        {},
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
      ])
    )
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: { slotName: '1' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 0 } },
          },
        },
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'initialPosition',
      labwareId: 'labwareId1',
      location: { slotName: '1' },
      position: mockStartPosition,
    })
  })

  it('executes correct chained commands when confirm placement CTA is clicked then go back on Flex', async () => {
    props = { ...props, robotType: FLEX_ROBOT_TYPE }
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {},
        {},
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
      ])
    )
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: { slotName: 'D1' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 44.5 } },
          },
        },
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'initialPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1' },
      position: mockStartPosition,
    })
  })

  it('renders the correct copy for moving a labware onto an adapter', () => {
    props = {
      ...props,
      labwareId: mockCompletedAnalysis.labware[1].id,
      adapterId: 'labwareId2',
    }
    render(props)
    screen.getByText('Prepare labware in Slot D1')
    screen.getByText(
      nestedTextMatcher(
        'Place a Mock Labware Definition followed by a Mock Labware Definition into Slot D1'
      )
    )
  })
  it('executes correct chained commands when confirm placement CTA is clicked for when there is an adapter', async () => {
    props = {
      ...props,
      adapterId: 'labwareId2',
    }
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {},
        {},
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
      ])
    )
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId2',
            newLocation: { slotName: 'D1' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: { labwareId: 'labwareId2' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 44.5 } },
          },
        },
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'initialPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1' },
      position: mockStartPosition,
    })
  })
  it('executes correct chained commands when go back clicked', async () => {
    props = {
      ...props,
      workingOffsets: [
        {
          location: { slotName: 'D1' },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    }
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        { commandType: 'home', params: {} },
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'initialPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1' },
      position: null,
    })
  })
  it('executes correct chained commands when confirm position clicked', async () => {
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockEndPosition },
          },
        },
        {},
        {},
      ])
    )
    props = {
      ...props,
      workingOffsets: [
        {
          location: { slotName: 'D1' },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    }
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm position' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
        {
          commandType: 'retractAxis' as const,
          params: {
            axis: 'leftZ',
          },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'x' },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'y' },
        },
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'finalPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1' },
      position: mockEndPosition,
    })
  })

  it('executes heater shaker open latch command on component mount if step is on HS', async () => {
    props = { ...props, robotType: FLEX_ROBOT_TYPE }
    props = {
      ...props,
      location: { slotName: 'D1', moduleModel: HEATERSHAKER_MODULE_V1 },
      moduleId: 'firstHSId',
      protocolData: {
        ...props.protocolData,
        modules: [
          {
            id: 'firstHSId',
            model: HEATERSHAKER_MODULE_V1,
            location: { slotName: 'D3' },
            serialNumber: 'firstHSSerial',
          },
          {
            id: 'secondHSId',
            model: HEATERSHAKER_MODULE_V1,
            location: { slotName: 'A1' },
            serialNumber: 'secondHSSerial',
          },
        ],
      },
    }
    render(props)
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: { moduleId: 'firstHSId' },
        },
        {
          commandType: 'heaterShaker/deactivateShaker',
          params: { moduleId: 'firstHSId' },
        },
        {
          commandType: 'heaterShaker/openLabwareLatch',
          params: { moduleId: 'firstHSId' },
        },
      ],
      false
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      2,
      [
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: { moduleId: 'firstHSId' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: { moduleId: 'firstHSId' },
        },
        {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: { moduleId: 'secondHSId' },
        },
        {
          commandType: 'moveToWell',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 44.5 } },
          },
        },
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
      ],
      false
    )
  })

  it('executes correct chained commands when confirm position clicked with HS and adapter', async () => {
    props = {
      ...props,
      location: { slotName: 'D1', moduleModel: HEATERSHAKER_MODULE_V1 },
      adapterId: 'adapterId',
      moduleId: 'heaterShakerId',
      protocolData: {
        ...props.protocolData,
        modules: [
          {
            id: 'heaterShakerId',
            model: HEATERSHAKER_MODULE_V1,
            location: { slotName: 'D3' },
            serialNumber: 'firstHSSerial',
          },
        ],
      },
      workingOffsets: [
        {
          location: { slotName: 'D1', moduleModel: HEATERSHAKER_MODULE_V1 },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    }
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockEndPosition },
          },
        },
        {},
        {},
        {},
        {},
        {},
        {},
      ])
    )

    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm position' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
        {
          commandType: 'retractAxis' as const,
          params: {
            axis: 'leftZ',
          },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'x' },
        },
        {
          commandType: 'retractAxis' as const,
          params: { axis: 'y' },
        },
        {
          commandType: 'heaterShaker/openLabwareLatch',
          params: { moduleId: 'heaterShakerId' },
        },
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'adapterId',
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'finalPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1', moduleModel: HEATERSHAKER_MODULE_V1 },
      position: mockEndPosition,
    })
  })

  it('executes thermocycler open lid command on mount if checking labware on thermocycler', () => {
    props = {
      ...props,
      location: { slotName: 'B1', moduleModel: THERMOCYCLER_MODULE_V2 },
      moduleId: 'tcId',
      protocolData: {
        ...props.protocolData,
        modules: [
          {
            id: 'tcId',
            model: THERMOCYCLER_MODULE_V2,
            location: { slotName: 'B1' },
            serialNumber: 'tcSerial',
          },
        ],
      },
    }
    render(props)
    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'thermocycler/openLid',
          params: { moduleId: 'tcId' },
        },
      ],
      false
    )
  })
  it('executes correct chained commands when confirm placement CTA is clicked when using probe for LPC', async () => {
    props = {
      ...props,
      robotType: FLEX_ROBOT_TYPE,
    }
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {},
        {},
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
      ])
    )
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await new Promise((resolve, reject) => setTimeout(resolve))

    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'moveLabware',
          params: {
            labwareId: 'labwareId1',
            newLocation: { slotName: 'D1' },
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveToWell',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'top', offset: { x: 0, y: 0, z: 44.5 } },
          },
        },
        {
          commandType: 'savePosition',
          params: { pipetteId: 'pipetteId1' },
        },
      ],
      false
    )
    expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
      type: 'initialPosition',
      labwareId: 'labwareId1',
      location: { slotName: 'D1' },
      position: mockStartPosition,
    })
  })
})
