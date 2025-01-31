import { Fragment, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import reduce from 'lodash/reduce'
import styled from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  CheckboxField,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DISPLAY_INLINE_BLOCK,
  Flex,
  InputField,
  JUSTIFY_CENTER,
  ListButton,
  ListButtonAccordion,
  ListButtonAccordionContainer,
  ListButtonRadioButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM,
  OT2_ROBOT_TYPE,
  getAreSlotsHorizontallyAdjacent,
  getIsLabwareAboveHeight,
  getLabwareDefIsStandard,
  getLabwareDefURI,
  getModuleType,
} from '@opentrons/shared-data'

import { LINK_BUTTON_STYLE } from '../../../atoms'
import { selectors as stepFormSelectors } from '../../../step-forms'
import { getOnlyLatestDefs } from '../../../labware-defs'
import {
  ADAPTER_96_CHANNEL,
  getLabwareIsCompatible as _getLabwareIsCompatible,
  getLabwareCompatibleWithAbsorbanceReader,
} from '../../../utils/labwareModuleCompatibility'
import { getHas96Channel } from '../../../utils'
import { createCustomLabwareDef } from '../../../labware-defs/actions'
import { getRobotType } from '../../../file-data/selectors'
import { getCustomLabwareDefsByURI } from '../../../labware-defs/selectors'
import { getPipetteEntities } from '../../../step-forms/selectors'
import { selectors } from '../../../labware-ingred/selectors'
import {
  selectLabware,
  selectNestedLabware,
} from '../../../labware-ingred/actions'
import { getEnableAbsorbanceReader } from '../../../feature-flags/selectors'
import {
  ALL_ORDERED_CATEGORIES,
  CUSTOM_CATEGORY,
  ORDERED_CATEGORIES,
} from './constants'
import {
  getLabwareIsRecommended,
  getLabwareCompatibleWithAdapter,
} from './utils'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { DeckSlotId, LabwareDefinition2 } from '@opentrons/shared-data'
import type { ModuleOnDeck } from '../../../step-forms'
import type { ThunkDispatch } from '../../../types'
import type { LabwareDefByDefURI } from '../../../labware-defs'
import type { CategoryExpand } from './DeckSetupTools'

const STANDARD_X_DIMENSION = 127.75
const STANDARD_Y_DIMENSION = 85.48
const PLATE_READER_LOADNAME =
  'opentrons_flex_lid_absorbance_plate_reader_module'
interface LabwareToolsProps {
  slot: DeckSlotId
  setHoveredLabware: (defUri: string | null) => void
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  areCategoriesExpanded: CategoryExpand
  setAreCategoriesExpanded: Dispatch<SetStateAction<CategoryExpand>>
  handleReset: () => void
}

interface LabwareInfo {
  uri: string
  def: LabwareDefinition2
}

export function LabwareTools(props: LabwareToolsProps): JSX.Element {
  const {
    slot,
    setHoveredLabware,
    searchTerm,
    setSearchTerm,
    areCategoriesExpanded,
    setAreCategoriesExpanded,
    handleReset,
  } = props
  const { t } = useTranslation(['starting_deck_state', 'shared'])
  const robotType = useSelector(getRobotType)
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const permittedTipracks = useSelector(stepFormSelectors.getPermittedTipracks)
  const pipetteEntities = useSelector(getPipetteEntities)
  const customLabwareDefs = useSelector(getCustomLabwareDefsByURI)
  const has96Channel = getHas96Channel(pipetteEntities)
  const defs = getOnlyLatestDefs()
  const deckSetup = useSelector(stepFormSelectors.getInitialDeckSetup)
  const zoomedInSlotInfo = useSelector(selectors.getZoomedInSlotInfo)
  const {
    selectedLabwareDefUri,
    selectedModuleModel,
    selectedNestedLabwareDefUri,
  } = zoomedInSlotInfo

  const searchFilter = (termToCheck: string): boolean =>
    termToCheck.toLowerCase().includes(searchTerm.toLowerCase())

  const modulesById = deckSetup.modules
  const moduleType =
    selectedModuleModel != null ? getModuleType(selectedModuleModel) : null
  const initialModules: ModuleOnDeck[] = Object.keys(modulesById).map(
    moduleId => modulesById[moduleId]
  )
  const [filterRecommended, setFilterRecommended] = useState<boolean>(
    moduleType != null
  )
  //    for OT-2 usage only due to H-S collisions
  const isNextToHeaterShaker = initialModules.some(
    hardwareModule =>
      hardwareModule.type === HEATERSHAKER_MODULE_TYPE &&
      getAreSlotsHorizontallyAdjacent(hardwareModule.slot, slot)
  )
  const [filterHeight, setFilterHeight] = useState<boolean>(
    robotType === OT2_ROBOT_TYPE ? isNextToHeaterShaker : false
  )

  const enablePlateReader = useSelector(getEnableAbsorbanceReader)

  const getLabwareCompatible = useCallback(
    (def: LabwareDefinition2) => {
      // assume that custom (non-standard) labware is (potentially) compatible
      if (moduleType == null || !getLabwareDefIsStandard(def)) {
        return true
      }
      return moduleType === ABSORBANCE_READER_TYPE
        ? getLabwareCompatibleWithAbsorbanceReader(def)
        : _getLabwareIsCompatible(def, moduleType)
    },
    [moduleType]
  )

  const getIsLabwareFiltered = useCallback(
    (labwareDef: LabwareDefinition2) => {
      const { dimensions, parameters } = labwareDef
      const { xDimension, yDimension } = dimensions

      const isSmallXDimension = xDimension < STANDARD_X_DIMENSION
      const isSmallYDimension = yDimension < STANDARD_Y_DIMENSION
      const isIrregularSize = isSmallXDimension && isSmallYDimension
      const isAdapter = labwareDef.allowedRoles?.includes('adapter')
      const isAdapter96Channel = parameters.loadName === ADAPTER_96_CHANNEL
      return (
        (filterRecommended &&
          !getLabwareIsRecommended(labwareDef, selectedModuleModel)) ||
        (filterHeight &&
          getIsLabwareAboveHeight(
            labwareDef,
            MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM
          )) ||
        !getLabwareCompatible(labwareDef) ||
        (isAdapter &&
          isIrregularSize &&
          moduleType !== HEATERSHAKER_MODULE_TYPE) ||
        (isAdapter96Channel && !has96Channel) ||
        (slot === 'offDeck' && isAdapter) ||
        (!enablePlateReader &&
          PLATE_READER_LOADNAME === parameters.loadName &&
          moduleType !== ABSORBANCE_READER_TYPE)
      )
    },
    [filterRecommended, filterHeight, getLabwareCompatible, moduleType, slot]
  )

  const labwareByCategory = useMemo(() => {
    return reduce<
      LabwareDefByDefURI,
      { [category: string]: LabwareDefinition2[] }
    >(
      defs,
      (acc, def: typeof defs[keyof typeof defs]) => {
        const category: string = def.metadata.displayCategory
        //  filter out non-permitted tipracks
        if (
          category === 'tipRack' &&
          !permittedTipracks.includes(getLabwareDefURI(def))
        ) {
          return acc
        }

        return {
          ...acc,
          [category]: [...(acc[category] || []), def],
        }
      },
      {}
    )
  }, [permittedTipracks])

  const filteredLabwareByCategory: Record<string, LabwareInfo[]> = useMemo(
    () =>
      ALL_ORDERED_CATEGORIES.reduce((acc, category) => {
        if (category === 'custom') {
          return {
            ...acc,
            [category]: filterRecommended
              ? []
              : Object.entries(customLabwareDefs).reduce<LabwareInfo[]>(
                  (accInner, [uri, def]) => {
                    return searchFilter(def.metadata.displayName)
                      ? [...accInner, { uri, def }]
                      : accInner
                  },
                  []
                ),
          }
        }
        const isDeckLocationCategory =
          slot === 'offDeck' ? category !== 'adapter' : true
        if (!(category in labwareByCategory) || !isDeckLocationCategory) {
          return { ...acc, [category]: [] }
        }
        return {
          ...acc,
          [category]: labwareByCategory[category].reduce<LabwareInfo[]>(
            (accInner, def) => {
              return searchFilter(def.metadata.displayName) &&
                !getIsLabwareFiltered(def)
                ? [...accInner, { def, uri: getLabwareDefURI(def) }]
                : accInner
            },
            []
          ),
        }
      }, {}),
    [labwareByCategory, getIsLabwareFiltered, searchTerm]
  )

  const handleCategoryClick = (category: string, expand?: boolean): void => {
    const updatedExpandState = {
      ...areCategoriesExpanded,
      [category]: expand ?? !areCategoriesExpanded[category],
    }
    setAreCategoriesExpanded(updatedExpandState)
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('add_labware')}
        </StyledText>
        <InputField
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value)
          }}
          placeholder="Search for labware..."
          size="medium"
          leftIcon="search"
          showDeleteIcon
          onDelete={handleReset}
        />
        {moduleType != null ||
        (isNextToHeaterShaker && robotType === OT2_ROBOT_TYPE) ? (
          <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
            <CheckboxField
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                isNextToHeaterShaker
                  ? setFilterHeight(e.currentTarget.checked)
                  : setFilterRecommended(e.currentTarget.checked)
              }}
              value={
                isNextToHeaterShaker && robotType === OT2_ROBOT_TYPE
                  ? filterHeight
                  : filterRecommended
              }
            />
            <StyledText desktopStyle="captionRegular">
              {t('only_display_rec')}
            </StyledText>
          </Flex>
        ) : null}
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        paddingTop={SPACING.spacing8}
      >
        {filteredLabwareByCategory[CUSTOM_CATEGORY].length > 0 ? (
          <ListButton
            key={`ListButton_${CUSTOM_CATEGORY}`}
            type="noActive"
            onClick={() => {
              handleCategoryClick(CUSTOM_CATEGORY)
            }}
          >
            <ListButtonAccordionContainer id={`${CUSTOM_CATEGORY}_${slot}`}>
              <ListButtonAccordion
                mainHeadline={t(`${CUSTOM_CATEGORY}`)}
                isExpanded={areCategoriesExpanded[CUSTOM_CATEGORY]}
              >
                {filteredLabwareByCategory[CUSTOM_CATEGORY].map(
                  ({ uri }, index) => (
                    <ListButtonRadioButton
                      key={`${index}_${uri}`}
                      id={`${index}_${uri}`}
                      buttonText={customLabwareDefs[uri].metadata.displayName}
                      setNoHover={() => {
                        setHoveredLabware(null)
                      }}
                      setHovered={() => {
                        setHoveredLabware(uri)
                      }}
                      buttonValue={uri}
                      onChange={e => {
                        e.stopPropagation()
                        dispatch(selectLabware({ labwareDefUri: uri }))
                      }}
                      isSelected={uri === selectedLabwareDefUri}
                    />
                  )
                )}
              </ListButtonAccordion>
            </ListButtonAccordionContainer>
          </ListButton>
        ) : null}
        {ORDERED_CATEGORIES.map(category => {
          if (filteredLabwareByCategory[category].length > 0) {
            return (
              <ListButton
                key={`ListButton_${category}`}
                type="noActive"
                onClick={() => {
                  handleCategoryClick(category)
                }}
              >
                <ListButtonAccordionContainer id={`${category}_${slot}`}>
                  <ListButtonAccordion
                    mainHeadline={t(`${category}`)}
                    isExpanded={areCategoriesExpanded[category]}
                  >
                    {filteredLabwareByCategory[category]?.map(
                      ({ def, uri }, index) => {
                        const loadName = def.parameters.loadName

                        return searchFilter(def.metadata.displayName) &&
                          !getIsLabwareFiltered(def) ? (
                          <Fragment key={`${index}_${category}_${loadName}`}>
                            <ListButtonRadioButton
                              setNoHover={() => {
                                setHoveredLabware(null)
                              }}
                              setHovered={() => {
                                setHoveredLabware(uri)
                              }}
                              id={`${index}_${category}_${loadName}`}
                              buttonText={def.metadata.displayName}
                              buttonValue={uri}
                              onChange={e => {
                                e.stopPropagation()
                                dispatch(
                                  selectLabware({
                                    labwareDefUri:
                                      uri === selectedLabwareDefUri
                                        ? null
                                        : uri,
                                  })
                                )
                                // reset the nested labware def uri in case it is not compatible
                                dispatch(
                                  selectNestedLabware({
                                    nestedLabwareDefUri: null,
                                  })
                                )
                              }}
                              isSelected={uri === selectedLabwareDefUri}
                            />

                            {uri === selectedLabwareDefUri &&
                              getLabwareCompatibleWithAdapter(loadName)
                                ?.length > 0 && (
                                <ListButtonAccordionContainer
                                  id={`nestedAccordionContainer_${loadName}`}
                                >
                                  <ListButtonAccordion
                                    key={`${index}_${category}_${loadName}_accordion`}
                                    isNested
                                    mainHeadline={t('adapter_compatible_lab')}
                                    isExpanded={uri === selectedLabwareDefUri}
                                  >
                                    {has96Channel &&
                                    loadName === ADAPTER_96_CHANNEL
                                      ? permittedTipracks.map(
                                          (tiprackDefUri, index) => {
                                            const nestedDef =
                                              defs[tiprackDefUri]
                                            return (
                                              <ListButtonRadioButton
                                                setNoHover={() => {
                                                  setHoveredLabware(null)
                                                }}
                                                setHovered={() => {
                                                  setHoveredLabware(
                                                    tiprackDefUri
                                                  )
                                                }}
                                                key={`${index}_${category}_${loadName}_${tiprackDefUri}`}
                                                id={`${index}_${category}_${loadName}_${tiprackDefUri}`}
                                                buttonText={
                                                  nestedDef?.metadata
                                                    .displayName ?? ''
                                                }
                                                buttonValue={tiprackDefUri}
                                                onChange={e => {
                                                  e.stopPropagation()
                                                  dispatch(
                                                    selectNestedLabware({
                                                      nestedLabwareDefUri: tiprackDefUri,
                                                    })
                                                  )
                                                }}
                                                isSelected={
                                                  tiprackDefUri ===
                                                  selectedNestedLabwareDefUri
                                                }
                                              />
                                            )
                                          }
                                        )
                                      : getLabwareCompatibleWithAdapter(
                                          loadName
                                        ).map(nestedDefUri => {
                                          const nestedDef = defs[nestedDefUri]

                                          return (
                                            <ListButtonRadioButton
                                              setNoHover={() => {
                                                setHoveredLabware(null)
                                              }}
                                              setHovered={() => {
                                                setHoveredLabware(nestedDefUri)
                                              }}
                                              key={`${index}_${category}_${loadName}_${nestedDefUri}`}
                                              id={`${index}_${category}_${loadName}_${nestedDefUri}`}
                                              buttonText={
                                                nestedDef?.metadata
                                                  .displayName ?? ''
                                              }
                                              buttonValue={nestedDefUri}
                                              onChange={e => {
                                                e.stopPropagation()
                                                dispatch(
                                                  selectNestedLabware({
                                                    nestedLabwareDefUri: nestedDefUri,
                                                  })
                                                )
                                              }}
                                              isSelected={
                                                nestedDefUri ===
                                                selectedNestedLabwareDefUri
                                              }
                                            />
                                          )
                                        })}
                                  </ListButtonAccordion>
                                </ListButtonAccordionContainer>
                              )}
                          </Fragment>
                        ) : null
                      }
                    )}
                  </ListButtonAccordion>
                </ListButtonAccordionContainer>
              </ListButton>
            )
          }
        })}
      </Flex>
      <Flex
        padding={`${SPACING.spacing4} ${SPACING.spacing12}`}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
      >
        <StyledLabel css={LINK_BUTTON_STYLE}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('upload_custom_labware')}
          </StyledText>
          <input
            data-testid="customLabwareInput"
            type="file"
            onChange={e => {
              dispatch(createCustomLabwareDef(e))
              handleCategoryClick(CUSTOM_CATEGORY, true)
            }}
          />
        </StyledLabel>
      </Flex>
    </Flex>
  )
}

const StyledLabel = styled.label`
  text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
  text-align: ${TYPOGRAPHY.textAlignCenter};
  display: ${DISPLAY_INLINE_BLOCK};
  cursor: ${CURSOR_POINTER};
  input[type='file'] {
    display: none;
  }
`
