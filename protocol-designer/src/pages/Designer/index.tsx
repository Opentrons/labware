import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ALIGN_END,
  COLORS,
  DIRECTION_COLUMN,
  FLEX_MAX_CONTENT,
  Flex,
  INFO_TOAST,
  SPACING,
  ToggleGroup,
  useOnClickOutside,
} from '@opentrons/components'
import {
  selectDropdownItem,
  selectTerminalItem,
} from '../../ui/steps/actions/actions'
import { useKitchen } from '../../organisms/Kitchen/hooks'
import { getDeckSetupForActiveItem } from '../../top-selectors/labware-locations'
import { generateNewProtocol } from '../../labware-ingred/actions'
import { DefineLiquidsModal, DesignerNavigation } from '../../organisms'
import { selectDesignerTab } from '../../file-data/actions'
import { getDesignerTab, getFileMetadata } from '../../file-data/selectors'
import { DeckSetupContainer } from './DeckSetup'
import { selectors } from '../../labware-ingred/selectors'
import { OffDeck } from './Offdeck'
import { LiquidsOverflowMenu } from './LiquidsOverflowMenu'
import { ProtocolSteps } from './ProtocolSteps'

import type { CutoutId } from '@opentrons/shared-data'
import type { DeckSlot } from '@opentrons/step-generation'

export interface OpenSlot {
  cutoutId: CutoutId
  slot: DeckSlot
}

export function Designer(): JSX.Element {
  const { t } = useTranslation([
    'starting_deck_state',
    'protocol_steps',
    'shared',
  ])
  const { bakeToast, makeSnackbar } = useKitchen()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const fileMetadata = useSelector(getFileMetadata)
  const zoomIn = useSelector(selectors.getZoomedInSlot)
  const deckSetup = useSelector(getDeckSetupForActiveItem)
  const isNewProtocol = useSelector(selectors.getIsNewProtocol)
  const [liquidOverflowMenu, showLiquidOverflowMenu] = useState<boolean>(false)
  const [showDefineLiquidModal, setDefineLiquidModal] = useState<boolean>(false)
  const tab = useSelector(getDesignerTab)
  const leftString = t('onDeck')
  const rightString = t('offDeck')

  const [deckView, setDeckView] = useState<
    typeof leftString | typeof rightString
  >(leftString)

  const { modules, additionalEquipmentOnDeck } = deckSetup

  const hasTrashEntity = Object.values(additionalEquipmentOnDeck).some(
    ae => ae.name === 'trashBin' || ae.name === 'wasteChute'
  )

  const startingDeckTab = {
    text: t('protocol_starting_deck'),
    isActive: tab === 'startingDeck',
    onClick: () => {
      dispatch(selectDesignerTab({ tab: 'startingDeck' }))
      dispatch(
        selectDropdownItem({
          selection: null,
          mode: 'clear',
        })
      )
    },
  }
  const protocolStepTab = {
    text: t('protocol_steps:protocol_steps'),
    isActive: tab === 'protocolSteps',
    onClick: () => {
      if (hasTrashEntity) {
        dispatch(selectDesignerTab({ tab: 'protocolSteps' }))
      } else {
        makeSnackbar(t('trash_required') as string)
      }
    },
  }

  const hasHardware =
    (modules != null && Object.values(modules).length > 0) ||
    // greater than 1 to account for the default loaded trashBin
    Object.values(additionalEquipmentOnDeck).length > 1

  // only display toast if its a newly made protocol and has hardware
  useEffect(() => {
    if (hasHardware && isNewProtocol) {
      bakeToast(t('add_rest') as string, INFO_TOAST, {
        heading: t('we_added_hardware'),
        closeButton: true,
      })
      dispatch(generateNewProtocol({ isNewProtocol: false }))
    }
  }, [])

  useEffect(() => {
    if (fileMetadata?.created == null) {
      console.warn(
        'fileMetadata was refreshed while on the designer page, redirecting to landing page'
      )
      navigate('/')
    }
  }, [fileMetadata])

  const overflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      if (!showDefineLiquidModal) {
        showLiquidOverflowMenu(false)
      }
    },
  })

  const deckViewItems =
    deckView === leftString ? (
      <DeckSetupContainer tab={tab} />
    ) : (
      <OffDeck tab={tab} />
    )

  useEffect(() => {
    if (tab === 'startingDeck') {
      //  ensure that the starting deck page is always showing the initial deck setup
      dispatch(selectTerminalItem('__initial_setup__'))
    }
  }, [tab])

  return (
    <>
      {showDefineLiquidModal ? (
        <DefineLiquidsModal
          onClose={() => {
            setDefineLiquidModal(false)
          }}
        />
      ) : null}
      {liquidOverflowMenu ? (
        <LiquidsOverflowMenu
          overflowWrapperRef={overflowWrapperRef}
          onClose={() => {
            showLiquidOverflowMenu(false)
          }}
          showLiquidsModal={() => {
            showLiquidOverflowMenu(false)
            setDefineLiquidModal(true)
          }}
        />
      ) : null}
      <Flex flexDirection={DIRECTION_COLUMN} minHeight={FLEX_MAX_CONTENT}>
        <DesignerNavigation
          hasZoomInSlot={zoomIn.slot != null || zoomIn.cutout != null}
          hasTrashEntity={hasTrashEntity}
          showLiquidOverflowMenu={showLiquidOverflowMenu}
          tabs={[startingDeckTab, protocolStepTab]}
        />

        {tab === 'startingDeck' ? (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            backgroundColor={COLORS.grey10}
            gridGap={SPACING.spacing24}
            padding={zoomIn.slot != null ? '0' : SPACING.spacing40}
            height="calc(100vh - 64px)"
          >
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing24}
              height="100%"
            >
              {zoomIn.slot == null ? (
                <Flex alignSelf={ALIGN_END}>
                  <ToggleGroup
                    selectedValue={deckView}
                    leftText={leftString}
                    rightText={rightString}
                    leftClick={() => {
                      setDeckView(leftString)
                    }}
                    rightClick={() => {
                      setDeckView(rightString)
                    }}
                  />
                </Flex>
              ) : null}
              {deckViewItems}
            </Flex>
          </Flex>
        ) : (
          <ProtocolSteps />
        )}
      </Flex>
    </>
  )
}
