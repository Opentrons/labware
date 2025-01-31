import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import flatten from 'lodash/flatten'

import {
  Checkbox,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  RadioButton,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { IconButton } from '/app/atoms/buttons/IconButton'

import type { Dispatch, SetStateAction, ReactNode } from 'react'
import type { WellGroup } from '@opentrons/components'
import type {
  LabwareDefinition2,
  PipetteChannels,
} from '@opentrons/shared-data'

interface Selection384WellsProps {
  allSelectedWells: WellGroup
  channels: PipetteChannels
  definition: LabwareDefinition2
  deselectWells: (wells: string[]) => void
  labwareRender: ReactNode
  selectWells: (wellGroup: WellGroup) => unknown
}

// magic numbers for 384 well plates
const WELL_COUNT_384 = 384
const COLUMN_COUNT_384 = 24
const ROW_COUNT_384 = 16

export function Selection384Wells({
  allSelectedWells,
  channels,
  definition,
  deselectWells,
  labwareRender,
  selectWells,
}: Selection384WellsProps): JSX.Element {
  const [selectBy, setSelectBy] = useState<'columns' | 'wells'>('columns')

  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  )

  const [startingWellState, setStartingWellState] = useState<
    Record<StartingWellOption, boolean>
  >({ A1: false, A2: false, B1: false, B2: false })

  // to reset last selected index and starting well state on page-level selected well reset
  useEffect(() => {
    if (Object.keys(allSelectedWells).length === 0) {
      setLastSelectedIndex(null)
      if (channels === 96) {
        // uncheck 96-channel starting wells
        setStartingWellState({ A1: false, A2: false, B1: false, B2: false })
      }
      // ensure A1 starting well is checked on mount
    } else if (allSelectedWells.A1 === null && channels === 96) {
      setStartingWellState(startingWellState => ({
        ...startingWellState,
        A1: true,
      }))
    }
  }, [allSelectedWells, channels])

  const columns = definition.ordering
  const wells = flatten(columns)

  const handleMinus = (): void => {
    if (lastSelectedIndex == null) {
      return
    }

    if (selectBy === 'wells') {
      deselectWells([wells[lastSelectedIndex]])
    } else {
      deselectWells(columns[lastSelectedIndex])
    }

    setLastSelectedIndex(lastSelectedIndex => {
      if (lastSelectedIndex != null && lastSelectedIndex !== 0) {
        return lastSelectedIndex - 1
      } else {
        return null
      }
    })
  }
  const handlePlus = (): void => {
    const nextIndex = lastSelectedIndex == null ? 0 : lastSelectedIndex + 1

    if (selectBy === 'columns') {
      if (channels === 8) {
        if (startingWellState.A1 && startingWellState.B1) {
          selectWells({
            [columns[nextIndex][0]]: null,
            [columns[nextIndex][1]]: null,
          })
        } else if (startingWellState.A1) {
          selectWells({
            [columns[nextIndex][0]]: null,
          })
        } else if (startingWellState.B1) {
          selectWells({
            [columns[nextIndex][1]]: null,
          })
        }
      } else {
        // for single channel, select all members of column
        selectWells(
          columns[nextIndex].reduce((acc, well) => {
            return { ...acc, [well]: null }
          }, {})
        )
      }
    } else if (selectBy === 'wells') {
      selectWells({
        [wells[nextIndex]]: null,
      })
    }

    setLastSelectedIndex(lastSelectedIndex =>
      lastSelectedIndex == null ? 0 : lastSelectedIndex + 1
    )
  }
  return (
    <Flex width="100%">
      {labwareRender}
      <Flex
        flex="1 0 0"
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing32}
        height="100%"
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        marginLeft={`-${SPACING.spacing12}`}
        paddingTop={SPACING.spacing24}
        paddingBottom={SPACING.spacing40}
      >
        {channels === 1 ? (
          <SelectBy
            selectBy={selectBy}
            setSelectBy={setSelectBy}
            setLastSelectedIndex={setLastSelectedIndex}
          />
        ) : (
          <StartingWell
            channels={channels}
            deselectWells={deselectWells}
            selectWells={selectWells}
            startingWellState={startingWellState}
            setStartingWellState={setStartingWellState}
            wells={wells}
          />
        )}
        <ButtonControls
          channels={channels}
          handleMinus={handleMinus}
          handlePlus={handlePlus}
          minusDisabled={lastSelectedIndex == null}
          plusDisabled={
            // disable 8-channel plus if no starting well selected
            (channels === 8 &&
              !startingWellState.A1 &&
              !startingWellState.B1) ||
            (selectBy === 'columns'
              ? lastSelectedIndex === COLUMN_COUNT_384 - 1
              : lastSelectedIndex === WELL_COUNT_384 - 1)
          }
        />
      </Flex>
    </Flex>
  )
}

interface SelectByProps {
  selectBy: 'columns' | 'wells'
  setSelectBy: Dispatch<SetStateAction<'columns' | 'wells'>>
  setLastSelectedIndex: Dispatch<SetStateAction<number | null>>
}

function SelectBy({
  selectBy,
  setSelectBy,
  setLastSelectedIndex,
}: SelectByProps): JSX.Element {
  const { t, i18n } = useTranslation('quick_transfer')

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
      <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
        {i18n.format(t('select_by'), 'capitalize')}
      </LegacyStyledText>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        <RadioButton
          buttonLabel={i18n.format(t('columns'), 'capitalize')}
          buttonValue="columns"
          isSelected={selectBy === 'columns'}
          onChange={() => {
            setSelectBy('columns')
            setLastSelectedIndex(lastSelectedIndex =>
              lastSelectedIndex != null
                ? Math.floor(lastSelectedIndex / ROW_COUNT_384)
                : lastSelectedIndex
            )
          }}
          radioButtonType="small"
        />
        <RadioButton
          buttonLabel={i18n.format(t('wells'), 'capitalize')}
          buttonValue="wells"
          isSelected={selectBy === 'wells'}
          onChange={() => {
            setSelectBy('wells')
            setLastSelectedIndex(lastSelectedIndex =>
              lastSelectedIndex != null
                ? (lastSelectedIndex + 1) * ROW_COUNT_384 - 1
                : lastSelectedIndex
            )
          }}
          radioButtonType="small"
        />
      </Flex>
    </Flex>
  )
}

type StartingWellOption = 'A1' | 'B1' | 'A2' | 'B2'

function StartingWell({
  channels,
  deselectWells,
  selectWells,
  startingWellState,
  setStartingWellState,
  wells,
}: {
  channels: PipetteChannels
  deselectWells: (wells: string[]) => void
  selectWells: (wellGroup: WellGroup) => void
  startingWellState: Record<StartingWellOption, boolean>
  setStartingWellState: Dispatch<
    SetStateAction<Record<StartingWellOption, boolean>>
  >
  wells: string[]
}): JSX.Element {
  const { t, i18n } = useTranslation('quick_transfer')

  const checkboxWellOptions: StartingWellOption[] =
    channels === 8 ? ['A1', 'B1'] : ['A1', 'A2', 'B1', 'B2']

  // on mount, select A1 well group for 96-channel
  useEffect(() => {
    // deselect all wells on mount; clears well selection when navigating back within quick transfer flow
    // otherwise, selected wells and lastSelectedIndex pointer will be out of sync
    deselectWells(wells)
    if (channels === 96) {
      selectWells({ A1: null })
    }
    setStartingWellState({ A1: true, A2: false, B1: false, B2: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
      <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
        {i18n.format(t('starting_well'), 'capitalize')}
      </LegacyStyledText>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        {checkboxWellOptions.map(well => (
          <Checkbox
            key={well}
            isChecked={startingWellState[well]}
            labelText={well}
            onClick={() => {
              if (channels === 96) {
                if (startingWellState[well]) {
                  deselectWells([well])
                } else {
                  selectWells({ [well]: null })
                }
              }

              setStartingWellState(startingWellState => ({
                ...startingWellState,
                [well]: !startingWellState[well],
              }))
            }}
          />
        ))}
      </Flex>
    </Flex>
  )
}

interface ButtonControlsProps {
  channels: PipetteChannels
  handleMinus: () => void
  handlePlus: () => void
  minusDisabled: boolean
  plusDisabled: boolean
}

function ButtonControls(props: ButtonControlsProps): JSX.Element {
  const {
    channels,
    handleMinus,
    handlePlus,
    minusDisabled,
    plusDisabled,
  } = props
  const { t, i18n } = useTranslation('quick_transfer')

  const addOrRemoveButtons =
    channels !== 96 ? (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
        <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {i18n.format(
            t(channels === 8 ? 'add_or_remove_columns' : 'add_or_remove'),
            'capitalize'
          )}
        </LegacyStyledText>
        <Flex gridGap={SPACING.spacing16} height="6.5rem">
          <IconButton
            disabled={minusDisabled}
            onClick={handleMinus}
            iconName="minus"
            hasBackground
            flex="1"
          />
          <IconButton
            disabled={plusDisabled}
            onClick={handlePlus}
            iconName="plus"
            hasBackground
            flex="1"
          />
        </Flex>
      </Flex>
    ) : null
  return <Flex flexDirection={DIRECTION_COLUMN}>{addOrRemoveButtons}</Flex>
}
