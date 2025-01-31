import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  Btn,
  DeckInfoLabel,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  ModuleIcon,
  POSITION_FIXED,
  RadioButton,
  SPACING,
  StyledText,
  Tabs,
  Toolbox,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
  getModuleDisplayName,
  getModuleType,
  MAGNETIC_BLOCK_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  MODULE_MODELS,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'

import { getRobotType } from '../../../file-data/selectors'
import {
  createDeckFixture,
  deleteDeckFixture,
} from '../../../step-forms/actions/additionalItems'
import { getSavedStepForms } from '../../../step-forms/selectors'
import { deleteModule } from '../../../step-forms/actions'
import { getDeckSetupForActiveItem } from '../../../top-selectors/labware-locations'
import {
  createContainer,
  deleteContainer,
  editSlotInfo,
  selectFixture,
  selectLabware,
  selectModule,
  selectNestedLabware,
  selectZoomedIntoSlot,
} from '../../../labware-ingred/actions'
import { useBlockingHint } from '../../../organisms/BlockingHintModal/useBlockingHint'
import { selectors } from '../../../labware-ingred/selectors'
import { useKitchen } from '../../../organisms/Kitchen/hooks'
import { getDismissedHints } from '../../../tutorial/selectors'
import { LINK_BUTTON_STYLE, NAV_BAR_HEIGHT_REM } from '../../../atoms'
import {
  createContainerAboveModule,
  createModuleEntityAndChangeForm,
} from '../../../step-forms/actions/thunks'
import { ConfirmDeleteStagingAreaModal } from '../../../organisms'
import { getSlotInformation } from '../utils'
import { ALL_ORDERED_CATEGORIES, FIXTURES, MOAM_MODELS } from './constants'
import { LabwareTools } from './LabwareTools'
import { MagnetModuleChangeContent } from './MagnetModuleChangeContent'
import { getModuleModelsBySlot, getDeckErrors } from './utils'

import type { AddressableAreaName, ModuleModel } from '@opentrons/shared-data'
import type { ThunkDispatch } from '../../../types'
import type { Fixture } from './constants'
import type { ModuleModelExtended } from './utils'

const mapModTypeToStepType: Record<string, string> = {
  heaterShakerModuleType: 'heaterShaker',
  magneticModuleType: 'magnet',
  temperatureModuleType: 'temperature',
  thermocyclerModuleType: 'thermocycler',
}

interface DeckSetupToolsProps {
  onCloseClick: () => void
  setHoveredLabware: (defUri: string | null) => void
  onDeckProps: {
    setHoveredModule: (model: ModuleModel | null) => void
    setHoveredFixture: (fixture: Fixture | null) => void
  } | null
  position?: string
}

export type CategoryExpand = Record<string, boolean>
export const DECK_SETUP_TOOLS_WIDTH_REM = 21.875

export function DeckSetupTools(props: DeckSetupToolsProps): JSX.Element | null {
  const {
    onCloseClick,
    setHoveredLabware,
    onDeckProps,
    position = POSITION_FIXED,
  } = props
  const { t, i18n } = useTranslation(['starting_deck_state', 'shared'])
  const { makeSnackbar } = useKitchen()
  const selectedSlotInfo = useSelector(selectors.getZoomedInSlotInfo)
  const robotType = useSelector(getRobotType)
  const savedSteps = useSelector(getSavedStepForms)
  const [showDeleteLabwareModal, setShowDeleteLabwareModal] = useState<
    ModuleModel | 'clear' | null
  >(null)
  const isDismissedModuleHint = useSelector(getDismissedHints).includes(
    'change_magnet_module_model'
  )
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const deckSetup = useSelector(getDeckSetupForActiveItem)
  const {
    selectedLabwareDefUri,
    selectedFixture,
    selectedModuleModel,
    selectedSlot,
    selectedNestedLabwareDefUri,
  } = selectedSlotInfo
  const { slot, cutout } = selectedSlot

  const [changeModuleWarningInfo, displayModuleWarning] = useState<boolean>(
    false
  )
  const [selectedHardware, setSelectedHardware] = useState<
    ModuleModelExtended | Fixture | null
  >(null)

  //  initialize the previously selected hardware because for some reason it does not
  //  work initiating it in the above useState
  useEffect(() => {
    if (selectedModuleModel !== null || selectedFixture != null) {
      if (
        selectedModuleModel === MAGNETIC_BLOCK_V1 &&
        selectedFixture === 'stagingArea'
      ) {
        setSelectedHardware('stagingAreaAndMagneticBlock')
      } else {
        setSelectedHardware(selectedModuleModel ?? selectedFixture ?? null)
      }
    }
  }, [selectedModuleModel, selectedFixture])

  const moduleModels =
    slot != null ? getModuleModelsBySlot(robotType, slot) : null
  const [tab, setTab] = useState<'hardware' | 'labware'>(
    moduleModels?.length === 0 || slot === 'offDeck' ? 'labware' : 'hardware'
  )

  const setAllCategories = (state: boolean): Record<string, boolean> =>
    ALL_ORDERED_CATEGORIES.reduce<Record<string, boolean>>(
      (acc, category) => ({ ...acc, [category]: state }),
      {}
    )
  const allCategoriesExpanded = setAllCategories(true)
  const allCategoriesCollapsed = setAllCategories(false)
  const [
    areCategoriesExpanded,
    setAreCategoriesExpanded,
  ] = useState<CategoryExpand>(allCategoriesCollapsed)
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    if (searchTerm !== '') {
      setAreCategoriesExpanded(allCategoriesExpanded)
    } else {
      setAreCategoriesExpanded(allCategoriesCollapsed)
    }
  }, [searchTerm])

  const hasMagneticModule = Object.values(deckSetup.modules).some(
    module => module.type === MAGNETIC_MODULE_TYPE
  )
  const moduleOnSlotIsMagneticModuleV1 =
    Object.values(deckSetup.modules).find(module => module.slot === slot)
      ?.model === MAGNETIC_MODULE_V1

  const handleCollapseAllCategories = (): void => {
    setAreCategoriesExpanded(allCategoriesCollapsed)
  }
  const handleResetSearchTerm = (): void => {
    setSearchTerm('')
  }
  const changeModuleWarning = useBlockingHint({
    hintKey: 'change_magnet_module_model',
    handleCancel: () => {
      displayModuleWarning(false)
    },
    handleContinue: () => {
      setSelectedHardware(
        moduleOnSlotIsMagneticModuleV1 ? MAGNETIC_MODULE_V2 : MAGNETIC_MODULE_V1
      )
      dispatch(
        selectModule({
          moduleModel: moduleOnSlotIsMagneticModuleV1
            ? MAGNETIC_MODULE_V2
            : MAGNETIC_MODULE_V1,
        })
      )
      displayModuleWarning(false)
    },
    content: <MagnetModuleChangeContent />,
    enabled: changeModuleWarningInfo,
  })

  if (slot == null || (onDeckProps == null && slot !== 'offDeck')) {
    return null
  }

  const {
    modules: deckSetupModules,
    additionalEquipmentOnDeck,
    labware: deckSetupLabware,
  } = deckSetup
  const hasTrash = Object.values(additionalEquipmentOnDeck).some(
    ae => ae.name === 'trashBin'
  )

  const {
    createdNestedLabwareForSlot,
    createdModuleForSlot,
    createdLabwareForSlot,
    createFixtureForSlots,
    matchingLabwareFor4thColumn,
  } = getSlotInformation({ deckSetup, slot })

  let fixtures: Fixture[] = []
  if (slot === 'D3') {
    fixtures = FIXTURES
  } else if (['A3', 'B3', 'C3'].includes(slot)) {
    fixtures = ['stagingArea', 'trashBin']
  } else if (['A1', 'B1', 'C1', 'D1'].includes(slot)) {
    fixtures = ['trashBin']
  }

  const hardwareTab = {
    text: t('deck_hardware'),
    disabled: moduleModels?.length === 0,
    isActive: tab === 'hardware',
    onClick: () => {
      setTab('hardware')
    },
  }

  const isLabwareTabDisabled =
    selectedFixture === 'wasteChute' ||
    selectedFixture === 'wasteChuteAndStagingArea' ||
    selectedFixture === 'trashBin' ||
    selectedModuleModel === ABSORBANCE_READER_V1
  let labwareTabDisabledReason: string | null = null
  if (selectedModuleModel === ABSORBANCE_READER_V1) {
    labwareTabDisabledReason = t('plate_reader_no_labware')
  }
  if (selectedFixture === 'trashBin') {
    labwareTabDisabledReason = t('trash_no_labware')
  }
  if (
    selectedFixture === 'wasteChute' ||
    selectedFixture === 'wasteChuteAndStagingArea'
  ) {
    labwareTabDisabledReason = t('waste_chute_no_labware')
  }
  const labwareTab = {
    text: t('labware'),
    disabled: isLabwareTabDisabled,
    disabledReasonForTooltip: labwareTabDisabledReason,
    isActive: tab === 'labware',
    onClick: () => {
      setTab('labware')
    },
  }

  const handleResetToolbox = (): void => {
    dispatch(
      editSlotInfo({
        createdNestedLabwareForSlot: null,
        createdLabwareForSlot: null,
        createdModuleForSlot: null,
        preSelectedFixture: null,
      })
    )
  }

  const handleResetLabwareTools = (): void => {
    handleCollapseAllCategories()
    handleResetSearchTerm()
  }

  const handleClear = (keepExistingLabware = false): void => {
    onDeckProps?.setHoveredModule(null)
    onDeckProps?.setHoveredFixture(null)
    if (slot !== 'offDeck') {
      //  clear module from slot
      if (createdModuleForSlot != null) {
        dispatch(deleteModule(createdModuleForSlot.id))
      }
      //  clear labware from slot
      if (
        createdLabwareForSlot != null &&
        (!keepExistingLabware ||
          createdLabwareForSlot.labwareDefURI !== selectedLabwareDefUri ||
          //  if nested labware changes but labware doesn't, still delete both
          (createdLabwareForSlot.labwareDefURI === selectedLabwareDefUri &&
            selectedNestedLabwareDefUri != null &&
            createdNestedLabwareForSlot?.labwareDefURI !==
              selectedNestedLabwareDefUri))
      ) {
        dispatch(deleteContainer({ labwareId: createdLabwareForSlot.id }))
      }
      //  clear nested labware from slot
      if (
        createdNestedLabwareForSlot != null &&
        (!keepExistingLabware ||
          createdNestedLabwareForSlot.labwareDefURI !==
            selectedNestedLabwareDefUri)
      ) {
        dispatch(deleteContainer({ labwareId: createdNestedLabwareForSlot.id }))
      }
      // clear labware on staging area 4th column slot
      if (matchingLabwareFor4thColumn != null && !keepExistingLabware) {
        dispatch(deleteContainer({ labwareId: matchingLabwareFor4thColumn.id }))
      }
      //  clear fixture(s) from slot
      if (createFixtureForSlots != null && createFixtureForSlots.length > 0) {
        createFixtureForSlots.forEach(fixture =>
          dispatch(deleteDeckFixture(fixture.id))
        )
        // zoom out if you're clearing a staging area slot directly from a 4th column
        if (
          FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS.includes(
            slot as AddressableAreaName
          )
        ) {
          dispatch(selectZoomedIntoSlot({ slot: null, cutout: null }))
        }
      }
    }
    handleResetToolbox()
    handleResetLabwareTools()
    setSelectedHardware(null)
    if (selectedHardware != null) {
      setTab('hardware')
    }
  }
  const handleConfirm = (): void => {
    //  clear entities first before recreating them
    handleClear(true)

    if (selectedFixture != null && cutout != null) {
      //  create fixture(s)
      if (selectedFixture === 'wasteChuteAndStagingArea') {
        dispatch(createDeckFixture('wasteChute', cutout))
        dispatch(createDeckFixture('stagingArea', cutout))
      } else {
        dispatch(createDeckFixture(selectedFixture, cutout))
      }
    }
    if (
      matchingLabwareFor4thColumn != null &&
      selectedFixture !== 'stagingArea' &&
      selectedFixture !== 'wasteChuteAndStagingArea'
    ) {
      dispatch(deleteContainer({ labwareId: matchingLabwareFor4thColumn.id }))
    }
    if (selectedModuleModel != null) {
      //  create module
      const moduleType = getModuleType(selectedModuleModel)

      const moduleSteps = Object.values(savedSteps).filter(step => {
        return (
          step.stepType === mapModTypeToStepType[moduleType] &&
          //  only update module steps that match the old moduleId
          //  to accommodate instances of MoaM
          step.moduleId === createdModuleForSlot?.id
        )
      })

      const pauseSteps = Object.values(savedSteps).filter(step => {
        return (
          step.stepType === 'pause' &&
          //  only update pause steps that match the old moduleId
          //  to accommodate instances of MoaM
          step.moduleId === createdModuleForSlot?.id
        )
      })

      dispatch(
        createModuleEntityAndChangeForm({
          slot,
          type: moduleType,
          model: selectedModuleModel,
          moduleSteps,
          pauseSteps,
        })
      )
    }
    if (
      (slot === 'offDeck' && selectedLabwareDefUri != null) ||
      (selectedModuleModel == null &&
        selectedLabwareDefUri != null &&
        (createdLabwareForSlot?.labwareDefURI !== selectedLabwareDefUri ||
          (selectedNestedLabwareDefUri != null &&
            selectedNestedLabwareDefUri !==
              createdNestedLabwareForSlot?.labwareDefURI)))
    ) {
      //  create adapter + labware on deck
      dispatch(
        createContainer({
          slot,
          labwareDefURI: selectedNestedLabwareDefUri ?? selectedLabwareDefUri,
          adapterUnderLabwareDefURI:
            selectedNestedLabwareDefUri == null
              ? undefined
              : selectedLabwareDefUri,
        })
      )
    }
    if (
      selectedModuleModel != null &&
      selectedLabwareDefUri != null &&
      (createdLabwareForSlot?.labwareDefURI !== selectedLabwareDefUri ||
        //  if nested labware changes but labware doesn't, still create both both
        (createdLabwareForSlot.labwareDefURI === selectedLabwareDefUri &&
          createdNestedLabwareForSlot?.labwareDefURI !==
            selectedNestedLabwareDefUri))
    ) {
      //   create adapter + labware on module
      dispatch(
        createContainerAboveModule({
          slot,
          labwareDefURI: selectedLabwareDefUri,
          nestedLabwareDefURI: selectedNestedLabwareDefUri ?? undefined,
        })
      )
    }
    handleResetToolbox()
    dispatch(selectZoomedIntoSlot({ slot: null, cutout: null }))
    onCloseClick()
  }
  const positionStyles =
    position === POSITION_FIXED
      ? {
          right: SPACING.spacing12,
          top: `calc(${NAV_BAR_HEIGHT_REM}rem + ${SPACING.spacing12})`,
        }
      : {}
  return (
    <>
      {showDeleteLabwareModal != null ? (
        <ConfirmDeleteStagingAreaModal
          onClose={() => {
            setShowDeleteLabwareModal(null)
          }}
          onConfirm={() => {
            if (showDeleteLabwareModal === 'clear') {
              handleClear()
              handleResetToolbox()
            } else if (MODULE_MODELS.includes(showDeleteLabwareModal)) {
              setSelectedHardware(showDeleteLabwareModal)
              dispatch(selectFixture({ fixture: null }))
              dispatch(selectModule({ moduleModel: showDeleteLabwareModal }))
              dispatch(selectLabware({ labwareDefUri: null }))
              dispatch(selectNestedLabware({ nestedLabwareDefUri: null }))
            }
            setShowDeleteLabwareModal(null)
          }}
        />
      ) : null}
      {changeModuleWarning}
      <Toolbox
        height={`calc(100vh - ${NAV_BAR_HEIGHT_REM}rem - 2 * ${SPACING.spacing12})`}
        width={`${DECK_SETUP_TOOLS_WIDTH_REM}rem`}
        position={position}
        {...positionStyles}
        title={
          <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
            <DeckInfoLabel
              deckLabel={
                slot === 'offDeck'
                  ? i18n.format(t('off_deck_title'), 'upperCase')
                  : slot
              }
            />
            <StyledText desktopStyle="bodyLargeSemiBold">
              {t('customize_slot')}
            </StyledText>
          </Flex>
        }
        secondaryHeaderButton={
          <Btn
            onClick={() => {
              if (matchingLabwareFor4thColumn != null) {
                setShowDeleteLabwareModal('clear')
              } else {
                handleClear()
                handleResetToolbox()
              }
            }}
            css={LINK_BUTTON_STYLE}
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('clear')}
            </StyledText>
          </Btn>
        }
        closeButton={<Icon size="2rem" name="close" />}
        onCloseClick={() => {
          onCloseClick()
          dispatch(selectZoomedIntoSlot({ slot: null, cutout: null }))
          handleResetToolbox()
        }}
        onConfirmClick={handleConfirm}
        confirmButtonText={t('done')}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
          {slot !== 'offDeck' ? (
            <Tabs tabs={[hardwareTab, labwareTab]} />
          ) : null}
          {tab === 'hardware' ? (
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
                <StyledText desktopStyle="bodyDefaultSemiBold">
                  {t('add_module')}
                </StyledText>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing4}
                >
                  {moduleModels?.map(model => {
                    const selectedModel =
                      model === 'stagingAreaAndMagneticBlock'
                        ? MAGNETIC_BLOCK_V1
                        : model
                    const modelSomewhereOnDeck = Object.values(
                      deckSetupModules
                    ).filter(
                      module => module.model === model && module.slot !== slot
                    )
                    const typeSomewhereOnDeck = Object.values(
                      deckSetupModules
                    ).filter(
                      module =>
                        module.type === getModuleType(selectedModel) &&
                        module.slot !== slot
                    )
                    const moamModels = MOAM_MODELS

                    const collisionError = getDeckErrors({
                      modules: deckSetupModules,
                      selectedSlot: slot,
                      selectedModel,
                      labware: deckSetupLabware,
                      robotType,
                    })

                    return (
                      <RadioButton
                        setNoHover={() => {
                          if (onDeckProps?.setHoveredModule != null) {
                            onDeckProps.setHoveredModule(null)
                          }
                          if (onDeckProps?.setHoveredFixture != null) {
                            onDeckProps.setHoveredFixture(null)
                          }
                        }}
                        setHovered={() => {
                          if (onDeckProps?.setHoveredModule != null) {
                            onDeckProps.setHoveredModule(selectedModel)
                          }
                          if (
                            onDeckProps?.setHoveredFixture != null &&
                            model === 'stagingAreaAndMagneticBlock'
                          ) {
                            onDeckProps.setHoveredFixture('stagingArea')
                          }
                        }}
                        largeDesktopBorderRadius
                        buttonLabel={
                          <Flex
                            gridGap={SPACING.spacing4}
                            alignItems={ALIGN_CENTER}
                          >
                            <ModuleIcon
                              size="1rem"
                              moduleType={getModuleType(selectedModel)}
                            />
                            <StyledText desktopStyle="bodyDefaultRegular">
                              {model === 'stagingAreaAndMagneticBlock'
                                ? t('shared:magneticBlockAndStagingArea', {
                                    module: getModuleDisplayName(
                                      MAGNETIC_BLOCK_V1
                                    ),
                                  })
                                : getModuleDisplayName(selectedModel)}
                            </StyledText>
                          </Flex>
                        }
                        key={`${model}_${slot}`}
                        buttonValue={model}
                        onChange={() => {
                          if (
                            modelSomewhereOnDeck.length === 1 &&
                            !moamModels.includes(selectedModel) &&
                            robotType === FLEX_ROBOT_TYPE
                          ) {
                            makeSnackbar(
                              t('one_item', {
                                hardware: getModuleDisplayName(selectedModel),
                              }) as string
                            )
                          } else if (
                            typeSomewhereOnDeck.length > 0 &&
                            robotType === OT2_ROBOT_TYPE
                          ) {
                            makeSnackbar(
                              t('one_item', {
                                hardware: t(
                                  `shared:${getModuleType(
                                    selectedModel
                                  ).toLowerCase()}`
                                ),
                              }) as string
                            )
                          } else if (collisionError != null) {
                            makeSnackbar(t(`${collisionError}`) as string)
                          } else if (
                            hasMagneticModule &&
                            (model === 'magneticModuleV1' ||
                              model === 'magneticModuleV2') &&
                            !isDismissedModuleHint
                          ) {
                            displayModuleWarning(true)
                          } else if (
                            selectedFixture === 'stagingArea' ||
                            (selectedFixture === 'wasteChuteAndStagingArea' &&
                              matchingLabwareFor4thColumn != null)
                          ) {
                            setShowDeleteLabwareModal(selectedModel)
                          } else {
                            setSelectedHardware(model)
                            dispatch(
                              selectFixture({
                                fixture:
                                  model === 'stagingAreaAndMagneticBlock'
                                    ? 'stagingArea'
                                    : null,
                              })
                            )
                            dispatch(
                              selectModule({ moduleModel: selectedModel })
                            )
                            dispatch(selectLabware({ labwareDefUri: null }))
                            dispatch(
                              selectNestedLabware({ nestedLabwareDefUri: null })
                            )
                          }
                        }}
                        isSelected={model === selectedHardware}
                      />
                    )
                  })}
                </Flex>
              </Flex>
              {robotType === OT2_ROBOT_TYPE || fixtures.length === 0 ? null : (
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing8}
                >
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {t('add_fixture')}
                  </StyledText>
                  <Flex
                    flexDirection={DIRECTION_COLUMN}
                    gridGap={SPACING.spacing4}
                  >
                    {fixtures.map(fixture => (
                      <RadioButton
                        setNoHover={() => {
                          if (onDeckProps?.setHoveredFixture != null) {
                            onDeckProps.setHoveredFixture(null)
                          }
                        }}
                        setHovered={() => {
                          if (onDeckProps?.setHoveredFixture != null) {
                            onDeckProps.setHoveredFixture(fixture)
                          }
                        }}
                        largeDesktopBorderRadius
                        buttonLabel={t(`shared:${fixture}`)}
                        key={`${fixture}_${slot}`}
                        buttonValue={fixture}
                        onChange={() => {
                          //    delete this when multiple trash bins are supported
                          if (fixture === 'trashBin' && hasTrash) {
                            makeSnackbar(
                              t('one_item', {
                                hardware: t('shared:trashBin'),
                              }) as string
                            )
                          } else {
                            setSelectedHardware(fixture)
                            dispatch(selectModule({ moduleModel: null }))
                            dispatch(selectFixture({ fixture }))
                            dispatch(selectLabware({ labwareDefUri: null }))
                            dispatch(
                              selectNestedLabware({ nestedLabwareDefUri: null })
                            )
                          }
                        }}
                        isSelected={fixture === selectedHardware}
                      />
                    ))}
                  </Flex>
                </Flex>
              )}
            </Flex>
          ) : (
            <LabwareTools
              setHoveredLabware={setHoveredLabware}
              slot={slot}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              areCategoriesExpanded={areCategoriesExpanded}
              setAreCategoriesExpanded={setAreCategoriesExpanded}
              handleReset={handleResetLabwareTools}
            />
          )}
        </Flex>
      </Toolbox>
    </>
  )
}
