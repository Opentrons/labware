import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import sum from 'lodash/sum'

import {
  ALIGN_CENTER,
  COLORS,
  DeckInfoLabel,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  InfoScreen,
  LiquidIcon,
  ListItem,
  ListItemDescriptor,
  Modal,
  ModuleIcon,
  SPACING,
  StyledText,
  Tag,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getModuleDisplayName,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'

import { getRobotType } from '../../file-data/selectors'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { HandleEnter } from '../../atoms/HandleEnter'
import { LINE_CLAMP_TEXT_STYLE } from '../../atoms'
import { getMainPagePortalEl } from '../Portal'

import type {
  AdditionalEquipmentName,
  LiquidEntities,
} from '@opentrons/step-generation'
import type { LabwareOnDeck, ModuleOnDeck } from '../../step-forms'

// ToDo (kk:09/04/2024) this should be removed when break-point is set up
const MODAL_MIN_WIDTH = '37.125rem'

export interface FixtureInList {
  name: AdditionalEquipmentName
  id: string
  location?: string
}

interface MaterialsListModalProps {
  hardware: ModuleOnDeck[]
  fixtures: FixtureInList[]
  labware: LabwareOnDeck[]
  liquids: LiquidEntities
  setShowMaterialsListModal: (showMaterialsListModal: boolean) => void
}

export function MaterialsListModal({
  hardware,
  fixtures,
  labware,
  liquids,
  setShowMaterialsListModal,
}: MaterialsListModalProps): JSX.Element {
  const { t } = useTranslation(['protocol_overview', 'shared'])
  const robotType = useSelector(getRobotType)
  const deckSetup = useSelector(getInitialDeckSetup)
  const { modules: modulesOnDeck, labware: labwareOnDeck } = deckSetup
  const allLabwareWellContents = useSelector(
    labwareIngredSelectors.getLiquidsByLabwareId
  )
  const tCSlot = robotType === FLEX_ROBOT_TYPE ? 'A1, B1' : '7,8,10,11'

  const handleClose = (): void => {
    setShowMaterialsListModal(false)
  }

  return createPortal(
    <HandleEnter onEnter={handleClose}>
      <Modal
        onClose={handleClose}
        closeOnOutsideClick
        title={t('materials_list')}
        marginLeft="0rem"
        minWidth={MODAL_MIN_WIDTH}
        childrenPadding={SPACING.spacing24}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('deck_hardware')}
            </StyledText>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
              {fixtures.length > 0
                ? fixtures.map(fixture => (
                    <ListItem type="noActive" key={fixture.id}>
                      <ListItemDescriptor
                        type="large"
                        description={
                          <Flex minWidth="13.75rem">
                            {fixture.location != null ? (
                              <DeckInfoLabel
                                deckLabel={fixture.location.replace(
                                  'cutout',
                                  ''
                                )}
                              />
                            ) : (
                              ''
                            )}
                          </Flex>
                        }
                        content={
                          <Flex alignItems={ALIGN_CENTER}>
                            <StyledText desktopStyle="bodyDefaultRegular">
                              {t(`shared:${fixture.name}`)}
                            </StyledText>
                          </Flex>
                        }
                      />
                    </ListItem>
                  ))
                : null}
              {hardware.length > 0 ? (
                hardware.map((hw, id) => {
                  const formatLocation = (slot: string): string => {
                    if (hw.type === THERMOCYCLER_MODULE_TYPE) {
                      return tCSlot
                    }
                    return slot.replace('cutout', '')
                  }
                  return (
                    <ListItem type="noActive" key={`hardware${id}`}>
                      <ListItemDescriptor
                        type="large"
                        description={
                          <Flex minWidth="13.75rem">
                            <DeckInfoLabel
                              deckLabel={formatLocation(hw.slot)}
                            />
                          </Flex>
                        }
                        content={
                          <Flex
                            alignItems={ALIGN_CENTER}
                            gridGap={SPACING.spacing4}
                          >
                            <ModuleIcon moduleType={hw.type} size="1rem" />
                            <StyledText desktopStyle="bodyDefaultRegular">
                              {getModuleDisplayName(hw.model)}
                            </StyledText>
                          </Flex>
                        }
                      />
                    </ListItem>
                  )
                })
              ) : (
                <InfoScreen content={t('no_deck_hardware')} />
              )}
            </Flex>
          </Flex>

          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('labware')}
            </StyledText>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
              {labware.length > 0 ? (
                labware.map(lw => {
                  const labwareOnModuleEntity = Object.values(
                    modulesOnDeck
                  ).find(mod => mod.id === lw.slot)
                  const labwareOnLabwareEntity = Object.values(
                    labwareOnDeck
                  ).find(labware => labware.id === lw.slot)
                  const labwareOnLabwareOnModuleSlot = Object.values(
                    modulesOnDeck
                  ).find(mod => mod.id === labwareOnLabwareEntity?.slot)?.slot
                  const labwareOnLabwareOnSlot = labwareOnLabwareEntity?.slot

                  let deckLabelSlot = lw.slot
                  if (labwareOnModuleEntity != null) {
                    deckLabelSlot =
                      labwareOnModuleEntity.type === THERMOCYCLER_MODULE_TYPE
                        ? tCSlot
                        : labwareOnModuleEntity.slot
                  } else if (labwareOnLabwareOnModuleSlot != null) {
                    deckLabelSlot = labwareOnLabwareOnModuleSlot
                  } else if (labwareOnLabwareOnSlot != null) {
                    deckLabelSlot = labwareOnLabwareOnSlot
                  } else if (deckLabelSlot === 'offDeck') {
                    deckLabelSlot = 'Off-deck'
                  }
                  return (
                    <ListItem type="noActive" key={`labware_${lw.id}`}>
                      <ListItemDescriptor
                        type="large"
                        description={
                          <Flex minWidth="13.75rem">
                            <DeckInfoLabel deckLabel={deckLabelSlot} />
                          </Flex>
                        }
                        content={
                          <StyledText desktopStyle="bodyDefaultRegular">
                            {lw.def.metadata.displayName}
                          </StyledText>
                        }
                      />
                    </ListItem>
                  )
                })
              ) : (
                <InfoScreen content={t('no_labware')} />
              )}
            </Flex>
          </Flex>

          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('liquids')}
            </StyledText>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
              {Object.values(liquids).length > 0 ? (
                <Flex
                  flexDirection={DIRECTION_ROW}
                  gridGap={SPACING.spacing8}
                  paddingX={SPACING.spacing12}
                >
                  <StyledText
                    flex="1"
                    desktopStyle="bodyDefaultRegular"
                    color={COLORS.grey60}
                  >
                    {t('name')}
                  </StyledText>
                  <StyledText
                    flex="1.27"
                    desktopStyle="bodyDefaultRegular"
                    color={COLORS.grey60}
                  >
                    {t('total_well_volume')}
                  </StyledText>
                </Flex>
              ) : null}
              <Flex gridGap={SPACING.spacing4} flexDirection={DIRECTION_COLUMN}>
                {Object.values(liquids).length > 0 ? (
                  Object.values(liquids).map((liquid, id) => {
                    const volumePerWell = Object.values(
                      allLabwareWellContents
                    ).flatMap(labwareWithIngred =>
                      Object.values(labwareWithIngred).map(
                        ingred => ingred[liquid.liquidGroupId]?.volume ?? 0
                      )
                    )
                    const totalVolume = sum(volumePerWell)

                    if (totalVolume === 0) {
                      return null
                    } else {
                      return (
                        <ListItem type="noActive" key={`liquid_${id}`}>
                          <ListItemDescriptor
                            type="large"
                            description={
                              <Flex
                                minWidth="13.75rem"
                                alignItems={ALIGN_CENTER}
                                gridGap={SPACING.spacing8}
                                width="13.75rem"
                              >
                                <LiquidIcon color={liquid.displayColor ?? ''} />
                                <StyledText
                                  desktopStyle="bodyDefaultRegular"
                                  css={LINE_CLAMP_TEXT_STYLE(3)}
                                >
                                  {liquid.displayName ?? t('n/a')}
                                </StyledText>
                              </Flex>
                            }
                            content={
                              <Tag
                                text={`${totalVolume.toString()} uL`}
                                type="default"
                              />
                            }
                          />
                        </ListItem>
                      )
                    }
                  })
                ) : (
                  <InfoScreen content={t('no_liquids')} />
                )}
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Modal>
    </HandleEnter>,
    getMainPagePortalEl()
  )
}
