import { describe, it, vi, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { MoveLabwareOnDeck } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { clickButtonLabeled } from '/app/organisms/ErrorRecoveryFlows/__tests__/util'
import { TwoColLwInfoAndDeck } from '../TwoColLwInfoAndDeck'
import { RECOVERY_MAP } from '../../constants'
import { LeftColumnLabwareInfo } from '../LeftColumnLabwareInfo'
import { getSlotNameAndLwLocFrom } from '../../hooks/useDeckMapUtils'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('@opentrons/components', async () => {
  const actual = await vi.importActual('@opentrons/components')
  return {
    ...actual,
    MoveLabwareOnDeck: vi.fn(),
  }
})
vi.mock('../LeftColumnLabwareInfo')
vi.mock('../../hooks/useDeckMapUtils')

let mockProceedNextStep: Mock

const render = (props: ComponentProps<typeof TwoColLwInfoAndDeck>) => {
  return renderWithProviders(<TwoColLwInfoAndDeck {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TwoColLwInfoAndDeck', () => {
  let props: ComponentProps<typeof TwoColLwInfoAndDeck>

  beforeEach(() => {
    mockProceedNextStep = vi.fn()

    props = {
      routeUpdateActions: {
        proceedNextStep: mockProceedNextStep,
      },
      failedPipetteUtils: {
        failedPipetteInfo: { data: { channels: 8 } },
        isPartialTipConfigValid: false,
      },
      failedLabwareUtils: {
        relevantWellName: 'A1',
        failedLabware: { location: 'C1' },
        failedLabwareLocations: {
          newLoc: {},
          currentLoc: {},
          displayNameCurrentLoc: 'Slot C1',
        },
      },
      deckMapUtils: {
        movedLabwareDef: {},
        moduleRenderInfo: [],
        labwareRenderInfo: [],
      },
      currentRecoveryOptionUtils: {
        selectedRecoveryOption: RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE,
      },
      isOnDevice: true,
    } as any

    vi.mocked(LeftColumnLabwareInfo).mockReturnValue(
      vi.fn(() => <div data-testid="mock-left-column-labware-info" />) as any
    )
    vi.mocked(getSlotNameAndLwLocFrom).mockReturnValue(['C1'] as any)
  })

  it('calls proceedNextStep when primary button is clicked', () => {
    render(props)
    clickButtonLabeled('Continue')
    expect(mockProceedNextStep).toHaveBeenCalled()
  })

  it(`passes correct title to LeftColumnLabwareInfo for ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE}`, () => {
    render(props)
    expect(vi.mocked(LeftColumnLabwareInfo)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manually move labware on deck',
        type: 'location-arrow-location',
        bannerText:
          'Ensure labware is accurately placed in the slot to prevent further errors.',
      }),
      expect.anything()
    )
  })

  it(`passes correct title to LeftColumnLabwareInfo for ${RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.ROUTE
    render(props)
    expect(vi.mocked(LeftColumnLabwareInfo)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manually replace labware on deck',
        type: 'location',
        bannerText:
          'Ensure labware is accurately placed in the slot to prevent further errors.',
      }),
      expect.anything()
    )
  })

  it(`passes correct title to LeftColumnLabwareInfo for ${RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE}`, () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE
    render(props)
    expect(vi.mocked(LeftColumnLabwareInfo)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Replace used tips in rack location A1 in Slot C1',
        type: 'location',
        bannerText:
          "It's best to replace tips and select the last location used for tip pickup.",
      }),
      expect.anything()
    )
  })

  it('passes correct title to LeftColumnLabwareInfo for 96-channel pipette', () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE
    // @ts-expect-error This is a test. It's always defined.
    props.failedPipetteUtils.failedPipetteInfo.data.channels = 96
    render(props)
    expect(vi.mocked(LeftColumnLabwareInfo)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Replace with new tip rack in Slot C1',
        type: 'location',
        bannerText:
          "It's best to replace tips and select the last location used for tip pickup.",
      }),
      expect.anything()
    )
  })

  it('passes correct title to LeftColumnLabwareInfo for partial tip config', () => {
    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.RETRY_NEW_TIPS.ROUTE
    props.failedPipetteUtils.isPartialTipConfigValid = true
    render(props)
    expect(vi.mocked(LeftColumnLabwareInfo)).toHaveBeenCalledWith(
      expect.objectContaining({
        bannerText:
          'Replace tips and select the last location used for partial tip pickup.',
      }),
      expect.anything()
    )
  })

  it(`renders a move labware on deck view if the selected recovery option is ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE} and props are valid`, () => {
    vi.mocked(MoveLabwareOnDeck).mockReturnValue(
      <div>MOCK_MOVE_LW_ON_DECK</div>
    )

    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE
    render(props)

    screen.getByText('MOCK_MOVE_LW_ON_DECK')
  })

  it(`does not render a move labware on deck view if the selected recovery option is ${RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE} and props are invalid`, () => {
    vi.mocked(MoveLabwareOnDeck).mockReturnValue(
      <div>MOCK_MOVE_LW_ON_DECK</div>
    )

    props.currentRecoveryOptionUtils.selectedRecoveryOption =
      RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.ROUTE
    props.deckMapUtils = {
      movedLabwareDef: null,
      moduleRenderInfo: null,
      labwareRenderInfo: null,
    } as any

    render(props)

    expect(screen.queryByText('MOCK_MOVE_LW_ON_DECK')).not.toBeInTheDocument()
  })
})
