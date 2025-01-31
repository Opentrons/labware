import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import startCase from 'lodash/startCase'
import { css } from 'styled-components'
import { useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  BORDERS,
  Box,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DropdownMenu,
  ERROR_TOAST,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  Link,
  MenuItem,
  POSITION_ABSOLUTE,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  SUCCESS_TOAST,
  TYPOGRAPHY,
  useOnClickOutside,
} from '@opentrons/components'
import { LabwareCreator } from '@opentrons/labware-library'
import {
  useTrackEvent,
  ANALYTICS_OPEN_LABWARE_CREATOR_FROM_BOTTOM_OF_LABWARE_LIBRARY_LIST,
} from '/app/redux/analytics'
import { addCustomLabwareFileFromCreator } from '/app/redux/custom-labware'
import { LabwareCard } from '/app/organisms/Desktop/Labware/LabwareCard'
import { AddCustomLabwareSlideout } from '/app/organisms/Desktop/Labware/AddCustomLabwareSlideout'
import { LabwareDetails } from '/app/organisms/Desktop/Labware/LabwareDetails'
import { useToaster } from '/app/organisms/ToasterOven'
import { useFeatureFlag } from '/app/redux/config'
import { useLabwareFailure, useNewLabwareName } from './hooks'
import { useAllLabware } from '/app/local-resources/labware'

import type { DropdownOption } from '@opentrons/components'
import type {
  LabwareFilter,
  LabwareSort,
  LabwareDefAndDate,
} from '/app/local-resources/labware'

const LABWARE_CREATOR_HREF = 'https://labware.opentrons.com/create/'
const labwareDisplayCategoryFilters: LabwareFilter[] = [
  'all',
  'adapter',
  'aluminumBlock',
  'customLabware',
  'lid',
  'reservoir',
  'tipRack',
  'tubeRack',
  'wellPlate',
]

// note: we've decided not to translate these categories
const FILTER_OPTIONS: DropdownOption[] = labwareDisplayCategoryFilters.map(
  category => ({
    name: startCase(category),
    value: category,
  })
)

const SORT_BY_BUTTON_STYLE = css`
  background-color: ${COLORS.transparent};
  cursor: ${CURSOR_POINTER};
  &:hover {
    background-color: ${COLORS.grey30};
  }
  &:active,
  &:focus {
    background-color: ${COLORS.grey40};
  }
`

export function Labware(): JSX.Element {
  const { t } = useTranslation(['labware_landing', 'shared'])
  const enableLabwareCreator = useFeatureFlag('enableLabwareCreator')
  const [sortBy, setSortBy] = useState<LabwareSort>('alphabetical')
  const [showSortByMenu, setShowSortByMenu] = useState<boolean>(false)
  const toggleSetShowSortByMenu = (): void => {
    setShowSortByMenu(!showSortByMenu)
  }
  const dispatch = useDispatch()
  const [showLC, setShowLC] = useState<boolean>(false)
  const trackEvent = useTrackEvent()
  const [filterBy, setFilterBy] = useState<LabwareFilter>('all')
  const { makeToast } = useToaster()

  const labware = useAllLabware(sortBy, filterBy)
  const { labwareFailureMessage, clearLabwareFailure } = useLabwareFailure()
  const { newLabwareName, clearLabwareName } = useNewLabwareName()
  const [showAddLabwareSlideout, setShowAddLabwareSlideout] = useState(false)

  const [
    currentLabwareDef,
    setCurrentLabwareDef,
  ] = useState<null | LabwareDefAndDate>(null)

  const sortOverflowWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      setShowSortByMenu(false)
    },
  })
  useEffect(() => {
    if (labwareFailureMessage != null) {
      setShowAddLabwareSlideout(false)
      makeToast(labwareFailureMessage, ERROR_TOAST, {
        closeButton: true,
        onClose: clearLabwareFailure,
      })
    } else if (newLabwareName != null) {
      setShowAddLabwareSlideout(false)
      makeToast(
        t('imported', { filename: newLabwareName }) as string,
        SUCCESS_TOAST,
        {
          closeButton: true,
          onClose: clearLabwareName,
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labwareFailureMessage, newLabwareName])

  return (
    <>
      {showLC ? (
        <LabwareCreator
          goBack={() => {
            setShowLC(false)
          }}
          save={(file: string) => {
            dispatch(addCustomLabwareFileFromCreator(file))
          }}
          isOnRunApp
        />
      ) : null}
      <Box paddingX={SPACING.spacing16} paddingY={SPACING.spacing16}>
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_CENTER}
          paddingBottom={SPACING.spacing24}
        >
          <LegacyStyledText
            as="h1"
            textTransform={TYPOGRAPHY.textTransformCapitalize}
          >
            {t('labware')}
          </LegacyStyledText>
          <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing4}>
            <SecondaryButton
              onClick={() => {
                setShowAddLabwareSlideout(true)
              }}
            >
              {t('import')}
            </SecondaryButton>
            {enableLabwareCreator ? (
              <PrimaryButton
                onClick={() => {
                  setShowLC(true)
                }}
              >
                Open Labware Creator
              </PrimaryButton>
            ) : null}
          </Flex>
        </Flex>
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_FLEX_END}
          paddingBottom={SPACING.spacing24}
        >
          <DropdownMenu
            filterOptions={FILTER_OPTIONS}
            currentOption={{ value: filterBy, name: startCase(filterBy) }}
            onClick={value => {
              setFilterBy(value as LabwareFilter)
            }}
            title={t('category')}
          />
          <Flex flexDirection={DIRECTION_ROW} alignItems={ALIGN_CENTER}>
            <LegacyStyledText css={TYPOGRAPHY.pSemiBold} color={COLORS.grey50}>
              {t('shared:sort_by')}
            </LegacyStyledText>
            <Flex
              flexDirection={DIRECTION_ROW}
              alignItems={ALIGN_CENTER}
              borderRadius={BORDERS.borderRadius8}
              marginLeft={SPACING.spacing8}
              css={SORT_BY_BUTTON_STYLE}
              onClick={toggleSetShowSortByMenu}
            >
              <LegacyStyledText
                css={TYPOGRAPHY.pSemiBold}
                paddingLeft={SPACING.spacing8}
                paddingRight={SPACING.spacing4}
                paddingY={SPACING.spacing4}
                data-testid="sortBy-label"
              >
                {sortBy === 'alphabetical'
                  ? t('shared:alphabetical')
                  : t('shared:reverse')}
              </LegacyStyledText>
              <Icon
                paddingRight={SPACING.spacing8}
                height={TYPOGRAPHY.lineHeight16}
                name={showSortByMenu ? 'chevron-up' : 'chevron-down'}
              />
            </Flex>
          </Flex>
          {showSortByMenu && (
            <Flex
              width="9.375rem"
              zIndex={2}
              borderRadius={BORDERS.borderRadius4}
              boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
              position={POSITION_ABSOLUTE}
              backgroundColor={COLORS.white}
              top="8.5rem"
              right={SPACING.spacing2}
              flexDirection={DIRECTION_COLUMN}
              ref={sortOverflowWrapperRef}
            >
              <MenuItem
                onClick={() => {
                  setSortBy('alphabetical')
                  setShowSortByMenu(false)
                }}
              >
                {t('shared:alphabetical')}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSortBy('reverse')
                  setShowSortByMenu(false)
                }}
              >
                {t('shared:reverse')}
              </MenuItem>
            </Flex>
          )}
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          {labware.map((labware, index) => (
            <LabwareCard
              key={`${String(labware.definition.metadata.displayName)}${index}`}
              labware={labware}
              onClick={() => {
                setCurrentLabwareDef(labware)
              }}
            />
          ))}
        </Flex>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
          alignItems={ALIGN_CENTER}
          marginTop={SPACING.spacing32}
        >
          <LegacyStyledText
            as="p"
            color={COLORS.black90}
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          >
            {t('create_new_def')}
          </LegacyStyledText>

          <Link
            external
            onClick={() => {
              trackEvent({
                name: ANALYTICS_OPEN_LABWARE_CREATOR_FROM_BOTTOM_OF_LABWARE_LIBRARY_LIST,
                properties: {},
              })
            }}
            href={LABWARE_CREATOR_HREF}
            css={TYPOGRAPHY.darkLinkLabelSemiBold}
          >
            {t('open_labware_creator')}
            <Icon
              name="open-in-new"
              size="0.5rem"
              marginLeft={SPACING.spacing4}
            />
          </Link>
        </Flex>
      </Box>
      {showAddLabwareSlideout && (
        <AddCustomLabwareSlideout
          isExpanded={showAddLabwareSlideout}
          onCloseClick={() => {
            setShowAddLabwareSlideout(false)
          }}
        />
      )}
      {currentLabwareDef != null && (
        <LabwareDetails
          labware={currentLabwareDef}
          onClose={() => {
            setCurrentLabwareDef(null)
          }}
        />
      )}
    </>
  )
}
