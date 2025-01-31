import { fireEvent, screen, waitFor } from '@testing-library/react'
import { it, describe, beforeEach, vi, afterEach, expect } from 'vitest'
import { FLEX_ROBOT_TYPE, HEATERSHAKER_MODULE_V1 } from '@opentrons/shared-data'
import { i18n } from '/app/i18n'
import { useProtocolMetadata } from '/app/resources/protocols'
import { getIsOnDevice } from '/app/redux/config'
import { PickUpTip } from '../PickUpTip'
import { SECTIONS } from '../constants'
import { mockCompletedAnalysis, mockExistingOffsets } from '../__fixtures__'
import { nestedTextMatcher, renderWithProviders } from '/app/__testing-utils__'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type { CommandData } from '@opentrons/api-client'

vi.mock('/app/resources/protocols')
vi.mock('/app/redux/config')

const mockStartPosition = { x: 10, y: 20, z: 30 }

const render = (props: ComponentProps<typeof PickUpTip>) => {
  return renderWithProviders(<PickUpTip {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('PickUpTip', () => {
  let props: ComponentProps<typeof PickUpTip>
  let mockChainRunCommands: Mock

  beforeEach(() => {
    mockChainRunCommands = vi.fn().mockImplementation(() => Promise.resolve())
    vi.mocked(getIsOnDevice).mockReturnValue(false)
    props = {
      section: SECTIONS.PICK_UP_TIP,
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
      protocolHasModules: false,
      currentStepIndex: 1,
    }
    vi.mocked(useProtocolMetadata).mockReturnValue({
      robotType: 'OT-3 Standard',
    })
  })
  afterEach(() => {
    vi.resetAllMocks()
  })
  it('renders correct copy when preparing space on desktop if protocol has modules', () => {
    props.protocolHasModules = true
    render(props)
    screen.getByRole('heading', { name: 'Prepare tip rack in Slot D1' })
    screen.getByText('Place modules on deck')
    screen.getByText(
      'Clear all deck slots of labware, leaving modules in place'
    )
    screen.getByText('a full Mock TipRack Definition')
    screen.getByText('Slot D1')
    screen.getByRole('button', { name: 'Confirm placement' })
  })
  it('renders correct copy when preparing space on touchscreen if protocol has modules', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    props.protocolHasModules = true
    render(props)
    screen.getByRole('heading', { name: 'Prepare tip rack in Slot D1' })
    screen.getByText('Place modules on deck')
    screen.getByText('Clear all deck slots of labware')
    screen.getByText('a full Mock TipRack Definition')
    screen.getByText('Slot D1')
  })
  it('renders correct copy when preparing space on desktop if protocol has no modules', () => {
    render(props)
    screen.getByRole('heading', { name: 'Prepare tip rack in Slot D1' })
    screen.getByText(
      'Clear all deck slots of labware, leaving modules in place'
    )
    screen.getByText('a full Mock TipRack Definition')
    screen.getByText('Slot D1')
    screen.getByRole('button', { name: 'Confirm placement' })
  })
  it('renders correct copy when preparing space on touchscreen if protocol has no modules', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByRole('heading', { name: 'Prepare tip rack in Slot D1' })
    screen.getByText('Clear all deck slots of labware')
    screen.getByText('a full Mock TipRack Definition')
    screen.getByText('Slot D1')
  })
  it('renders correct copy when confirming position on desktop', () => {
    render({
      ...props,
      workingOffsets: [
        {
          location: { slotName: 'D1' },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    })
    screen.getByRole('heading', {
      name: 'Pick up tip from tip rack in Slot D1',
    })
    screen.getByText(
      "Ensure that the pipette nozzle furthest from you is centered above and level with the top of the tip in the A1 position. If it isn't, use the controls below or your keyboard to jog the pipette until it is properly aligned."
    )
    screen.getByRole('link', { name: 'Need help?' })
  })
  it('renders correct copy when confirming position on touchscreen', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render({
      ...props,
      workingOffsets: [
        {
          location: { slotName: 'D1' },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    })
    screen.getByRole('heading', {
      name: 'Pick up tip from tip rack in Slot D1',
    })
    screen.getByText(
      nestedTextMatcher(
        "Ensure that the pipette nozzle furthest from you is centered above and level with the top of the tip in the A1 position. If it isn't, tap Move pipette and then jog the pipette until it is properly aligned."
      )
    )
  })
  it('executes correct chained commands when confirm placement CTA is clicked', () => {
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([{} as CommandData])
    )
    render(props)
    const confirm = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(confirm)
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
            wellLocation: { origin: 'top', offset: undefined },
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

  it('executes correct chained commands when confirm position CTA is clicked and user tries again', async () => {
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
        {},
        {},
      ])
    )

    render({
      ...props,
      workingOffsets: [
        {
          location: { slotName: 'D1' },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    })

    const forward = screen.getByRole('button', { name: 'forward' })
    fireEvent.click(forward)
    expect(props.handleJog).toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: 'Confirm position' })
    fireEvent.click(confirm)
    await new Promise((resolve, reject) => setTimeout(resolve))

    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenNthCalledWith(
        1,
        [
          {
            commandType: 'savePosition',
            params: { pipetteId: 'pipetteId1' },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
        type: 'finalPosition',
        labwareId: 'labwareId1',
        location: { slotName: 'D1' },
        position: { x: 10, y: 20, z: 30 },
      })
    })
    await waitFor(() => {
      expect(props.registerPosition).toHaveBeenNthCalledWith(2, {
        type: 'tipPickUpOffset',
        offset: { x: 9, y: 18, z: 27 },
      })
    })
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenNthCalledWith(
        2,
        [
          {
            commandType: 'pickUpTip',
            params: {
              pipetteId: 'pipetteId1',
              labwareId: 'labwareId1',
              wellName: 'A1',
              wellLocation: { origin: 'top', offset: { x: 9, y: 18, z: 27 } },
            },
          },
        ],
        false
      )
      screen.getByRole('heading', {
        name: 'Did pipette pick up tip successfully?',
      })
    })
    const tryAgain = screen.getByRole('button', { name: 'Try again' })
    fireEvent.click(tryAgain)
    await new Promise((resolve, reject) => setTimeout(resolve))

    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenNthCalledWith(
        3,
        [
          {
            commandType: 'dropTip',
            params: {
              pipetteId: 'pipetteId1',
              labwareId: 'labwareId1',
              wellName: 'A1',
            },
          },
          {
            commandType: 'moveToWell',
            params: {
              pipetteId: 'pipetteId1',
              labwareId: 'labwareId1',
              wellName: 'A1',
              wellLocation: { origin: 'top' },
            },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.registerPosition).toHaveBeenNthCalledWith(3, {
        type: 'tipPickUpOffset',
        offset: null,
      })
    })
  })
  it('proceeds after confirm position and pick up tip', async () => {
    vi.mocked(mockChainRunCommands).mockImplementation(() =>
      Promise.resolve([
        {
          data: {
            commandType: 'savePosition',
            result: { position: mockStartPosition },
          },
        },
        {},
        {},
      ])
    )
    render({
      ...props,
      workingOffsets: [
        {
          location: { slotName: 'D1' },
          labwareId: 'labwareId1',
          initialPosition: { x: 1, y: 2, z: 3 },
          finalPosition: null,
        },
      ],
    })

    const confirm = screen.getByRole('button', { name: 'Confirm position' })
    fireEvent.click(confirm)
    await new Promise((resolve, reject) => setTimeout(resolve))

    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenNthCalledWith(
        1,
        [
          {
            commandType: 'savePosition',
            params: { pipetteId: 'pipetteId1' },
          },
        ],
        false
      )
    })
    await waitFor(() => {
      expect(props.registerPosition).toHaveBeenNthCalledWith(1, {
        type: 'finalPosition',
        labwareId: 'labwareId1',
        location: { slotName: 'D1' },
        position: { x: 10, y: 20, z: 30 },
      })
    })
    await waitFor(() => {
      expect(props.registerPosition).toHaveBeenNthCalledWith(2, {
        type: 'tipPickUpOffset',
        offset: { x: 9, y: 18, z: 27 },
      })
    })
    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenNthCalledWith(
        2,
        [
          {
            commandType: 'pickUpTip',
            params: {
              pipetteId: 'pipetteId1',
              labwareId: 'labwareId1',
              wellName: 'A1',
              wellLocation: { origin: 'top', offset: { x: 9, y: 18, z: 27 } },
            },
          },
        ],
        false
      )
      screen.getByRole('heading', {
        name: 'Did pipette pick up tip successfully?',
      })
    })
    const yesButton = screen.getByRole('button', { name: 'Yes' })
    fireEvent.click(yesButton)
    await new Promise((resolve, reject) => setTimeout(resolve))

    await waitFor(() => {
      expect(props.chainRunCommands).toHaveBeenNthCalledWith(
        3,
        [
          {
            commandType: 'retractAxis' as const,
            params: {
              axis: 'leftZ',
            },
          },
          {
            commandType: 'retractAxis' as const,
            params: {
              axis: 'x',
            },
          },
          {
            commandType: 'retractAxis' as const,
            params: {
              axis: 'y',
            },
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
    })
    await waitFor(() => {
      expect(props.proceed).toHaveBeenCalled()
    })
  })
  it('executes heater shaker closed latch commands for every hs module before other commands', () => {
    props = {
      ...props,
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
    const confirm = screen.getByRole('button', { name: 'Confirm placement' })
    fireEvent.click(confirm)
    expect(props.chainRunCommands).toHaveBeenNthCalledWith(
      1,
      [
        {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: { moduleId: 'firstHSId' },
        },
        {
          commandType: 'heaterShaker/closeLabwareLatch',
          params: { moduleId: 'secondHSId' },
        },
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
            wellLocation: { origin: 'top' },
          },
        },
        { commandType: 'savePosition', params: { pipetteId: 'pipetteId1' } },
      ],
      false
    )
  })
})
