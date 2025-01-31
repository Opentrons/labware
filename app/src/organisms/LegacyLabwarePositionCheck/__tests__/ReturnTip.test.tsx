import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { FLEX_ROBOT_TYPE, HEATERSHAKER_MODULE_V1 } from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { SECTIONS } from '../constants'
import { mockCompletedAnalysis } from '../__fixtures__'
import { useProtocolMetadata } from '/app/resources/protocols'
import { getIsOnDevice } from '/app/redux/config'
import { ReturnTip } from '../ReturnTip'

import type { ComponentProps } from 'react'

vi.mock('/app/redux/config')
vi.mock('/app/resources/protocols')

const render = (props: ComponentProps<typeof ReturnTip>) => {
  return renderWithProviders(<ReturnTip {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ReturnTip', () => {
  let props: ComponentProps<typeof ReturnTip>
  let mockChainRunCommands

  beforeEach(() => {
    mockChainRunCommands = vi.fn().mockImplementation(() => Promise.resolve())
    vi.mocked(getIsOnDevice).mockReturnValue(false)
    props = {
      section: SECTIONS.RETURN_TIP,
      pipetteId: mockCompletedAnalysis.pipettes[0].id,
      labwareId: mockCompletedAnalysis.labware[0].id,
      definitionUri: mockCompletedAnalysis.labware[0].definitionUri,
      location: { slotName: 'D1' },
      protocolData: mockCompletedAnalysis,
      proceed: vi.fn(),
      setFatalError: vi.fn(),
      chainRunCommands: mockChainRunCommands,
      tipPickUpOffset: null,
      isRobotMoving: false,
      robotType: FLEX_ROBOT_TYPE,
    }
    vi.mocked(useProtocolMetadata).mockReturnValue({
      robotType: 'OT-3 Standard',
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('renders correct copy on desktop', () => {
    render(props)
    screen.getByRole('heading', { name: 'Return tip rack to Slot D1' })
    screen.getByText(
      'Clear all deck slots of labware, leaving modules in place'
    )
    screen.getByText(/Mock TipRack Definition/i)
    screen.getByText(/that you used before back into/i)
    screen.getByText('Slot D1')
    screen.getByText(
      /The pipette will return tips to their original location in the rack./i
    )
    screen.getByRole('link', { name: 'Need help?' })
  })
  it('renders correct copy on device', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)
    screen.getByRole('heading', { name: 'Return tip rack to Slot D1' })
    screen.getByText('Clear all deck slots of labware')
    screen.getByText(/Mock TipRack Definition/i)
    screen.getByText(/that you used before back into/i)
    screen.getByText('Slot D1')
    screen.getByText(
      /The pipette will return tips to their original location in the rack./i
    )
  })
  it('executes correct chained commands when CTA is clicked', async () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await expect(props.chainRunCommands).toHaveBeenNthCalledWith(
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
          commandType: 'dropTip',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: { origin: 'default', offset: undefined },
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
        { commandType: 'home', params: {} },
      ],
      false
    )
    // temporary comment-out
    // await expect(props.proceed).toHaveBeenCalled()
  })
  it('executes correct chained commands with tip pick up offset when CTA is clicked', async () => {
    props = {
      ...props,
      tipPickUpOffset: { x: 10, y: 11, z: 12 },
    }
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await expect(props.chainRunCommands).toHaveBeenNthCalledWith(
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
            wellLocation: { origin: 'top', offset: { x: 10, y: 11, z: 12 } },
          },
        },
        {
          commandType: 'dropTip',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: {
              origin: 'default',
              offset: { x: 10, y: 11, z: 12 },
            },
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
        { commandType: 'home', params: {} },
      ],
      false
    )
    // temporary comment-out
    // await expect(props.proceed).toHaveBeenCalled()
  })
  it('executes heater shaker closed latch commands for every hs module before other commands', async () => {
    props = {
      ...props,
      tipPickUpOffset: { x: 10, y: 11, z: 12 },
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
    fireEvent.click(screen.getByRole('button', { name: 'Confirm placement' }))
    await expect(props.chainRunCommands).toHaveBeenNthCalledWith(
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
            wellLocation: { origin: 'top', offset: { x: 10, y: 11, z: 12 } },
          },
        },
        {
          commandType: 'dropTip',
          params: {
            pipetteId: 'pipetteId1',
            labwareId: 'labwareId1',
            wellName: 'A1',
            wellLocation: {
              origin: 'default',
              offset: { x: 10, y: 11, z: 12 },
            },
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
        { commandType: 'home', params: {} },
      ],
      false
    )
    // temporary comment-out
    // await expect(props.proceed).toHaveBeenCalled()
  })
})
