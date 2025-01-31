import { css } from 'styled-components'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  BORDERS,
  Btn,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  InputField,
  JUSTIFY_SPACE_BETWEEN,
  NO_WRAP,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { LINK_BUTTON_STYLE } from '../../../../../../atoms'
import {
  isTimeFormatMinutesSeconds,
  temperatureRangeFieldValue,
} from '../../../../../../steplist/fieldLevel/errors'
import {
  maskToFloat,
  maskToInteger,
  maskToTime,
} from '../../../../../../steplist/fieldLevel/processing'
import { uuid } from '../../../../../../utils'
import { getTimeFromString, getStepIndex } from './utils'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { ThermocyclerStepTypeGeneral } from './ThermocyclerProfileModal'
import type { ThermocyclerStepType } from './ThermocyclerStep'

export interface ThermocyclerCycleType {
  id: string
  title: string
  steps: ThermocyclerStepType[]
  type: 'profileCycle'
  repetitions: string
}

interface CycleStepValues {
  value: string | null
  error: string | null
  wasAccessed?: boolean
}
interface CycleStepType {
  name: CycleStepValues
  temp: CycleStepValues
  time: CycleStepValues
}

interface ThermocyclerCycleProps {
  steps: ThermocyclerStepTypeGeneral[]
  setSteps: Dispatch<SetStateAction<ThermocyclerStepTypeGeneral[]>>
  setShowCreateNewCycle: Dispatch<SetStateAction<boolean>>
  step?: ThermocyclerCycleType
  backgroundColor?: string
  readOnly?: boolean
  setIsInEdit: Dispatch<SetStateAction<boolean>>
}

export function ThermocyclerCycle(props: ThermocyclerCycleProps): JSX.Element {
  const {
    setShowCreateNewCycle,
    step,
    steps,
    setSteps,
    backgroundColor = COLORS.grey30,
    setIsInEdit,
    readOnly = true,
  } = props
  const { i18n, t } = useTranslation(['application', 'form'])
  const [hover, setHover] = useState<boolean>(false)
  const [showEdit, setShowEditCurrentCycle] = useState<boolean>(!readOnly)

  const [orderedCycleStepIds, setOrderedCycleStepIds] = useState<string[]>(
    step?.steps.map(cycleStep => cycleStep.id) ?? []
  )
  const [cycleStepsById, setCycleStepsById] = useState(
    step?.steps.reduce<Record<string, CycleStepType>>(
      (acc, { id, title, temperature, durationMinutes, durationSeconds }) => {
        return {
          ...acc,
          [id]: {
            name: { value: title ?? null, error: null },
            temp: {
              value: temperature ?? null,
              error: null,
              wasAccessed: false,
            },
            time: {
              value:
                durationMinutes != null && durationSeconds != null
                  ? `${durationMinutes}:${durationSeconds}`
                  : null,
              error: null,
              wasAccessed: false,
            },
          },
        }
      },
      {}
    ) ?? {}
  )
  const [repetitions, setRepetitions] = useState<string | undefined>(
    step?.repetitions
  )

  const cycleId = step?.id ?? null
  const isStepStateError =
    Object.values(cycleStepsById).some(cycleStep =>
      Object.values(cycleStep).some(
        ({ value, error }) => value == null || value === '' || error != null
      )
    ) ||
    repetitions == null ||
    repetitions === ''

  const blankStep: CycleStepType = {
    name: {
      value: null,
      error: null,
    },
    temp: {
      value: null,
      error: null,
    },
    time: {
      value: null,
      error: null,
    },
  }

  useEffect(() => {
    if (orderedCycleStepIds.length === 0) {
      // prepopulate with blank step on mount if not editing
      handleAddCycleStep()
      setIsInEdit(true)
    }
  }, [])

  const handleAddCycleStep = (): void => {
    const newStepId = uuid()
    setOrderedCycleStepIds([...orderedCycleStepIds, newStepId])
    setCycleStepsById({ ...cycleStepsById, [newStepId]: blankStep })
  }

  const handleDeleteStep = (stepId: string): void => {
    const filteredOrdredCycleStepIds = orderedCycleStepIds.filter(
      id => id !== stepId
    )
    setOrderedCycleStepIds(filteredOrdredCycleStepIds)
    setCycleStepsById(
      filteredOrdredCycleStepIds.reduce((acc, id) => {
        return id !== stepId
          ? {
              ...acc,
              [id]: cycleStepsById[id],
            }
          : acc
      }, {})
    )
  }
  const handleDeleteCycle = (): void => {
    if (cycleId != null) {
      setSteps(
        steps.filter((s: any) => {
          return s.id !== cycleId
        })
      )
    } else {
      setShowCreateNewCycle(false)
    }
    setIsInEdit(false)
  }
  const handleValueUpdate = (
    stepId: string,
    field: 'name' | 'temp' | 'time',
    value: string,
    errorCheck?: (value: any) => string | null
  ): void => {
    setCycleStepsById({
      ...cycleStepsById,
      [stepId]: {
        ...cycleStepsById[stepId],
        [field]: {
          value,
          error: errorCheck?.(value) ?? null,
        },
      },
    })
  }
  const handleSaveCycle = (): void => {
    const orderedCycleSteps = orderedCycleStepIds.map(cycleStepId => {
      const step = cycleStepsById[cycleStepId]
      const { minutes, seconds } = getTimeFromString(step.time.value ?? '')
      const cycleStepData: ThermocyclerStepType = {
        durationMinutes: minutes,
        durationSeconds: seconds,
        id: cycleStepId,
        temperature: step.temp.value ?? '',
        title: step.name.value ?? '',
        type: 'profileStep',
      }
      return cycleStepData
    })
    const cycleData: ThermocyclerCycleType = {
      id: cycleId ?? uuid(),
      title: '',
      steps: orderedCycleSteps,
      type: 'profileCycle',
      repetitions: repetitions ?? '',
    }
    const existingCycleIndex = steps.findIndex(step => step.id === cycleId)
    if (existingCycleIndex >= 0) {
      // editing a cycle that was already created
      setSteps([
        ...steps.slice(0, existingCycleIndex),
        cycleData,
        ...steps.slice(existingCycleIndex + 1),
      ])
    } else {
      // append to end of steps
      setSteps([...steps, cycleData])
    }
    setShowCreateNewCycle(false)
    setShowEditCurrentCycle(false)
    setIsInEdit(false)
  }

  const header = showEdit ? (
    <Flex
      padding={SPACING.spacing12}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      width="100%"
    >
      <Flex gridGap={SPACING.spacing24} alignItems={ALIGN_CENTER}>
        <StyledText
          desktopStyle="bodyDefaultRegular"
          borderRadius={BORDERS.borderRadius4}
          backgroundColor={`${COLORS.black90}${COLORS.opacity20HexCode}`}
          padding={`${SPACING.spacing2} ${SPACING.spacing8}`}
        >
          {cycleId != null ? getStepIndex(steps, cycleId) : steps.length + 1}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {i18n.format(
            t('form:step_edit_form.field.thermocyclerProfile.cycle'),
            'capitalize'
          )}
        </StyledText>
      </Flex>
      <Flex gridGap={SPACING.spacing8}>
        <Btn
          onClick={handleDeleteCycle}
          whiteSpace={NO_WRAP}
          textDecoration={TYPOGRAPHY.textDecorationUnderline}
          padding={SPACING.spacing4}
          css={LINK_BUTTON_STYLE}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {i18n.format(
              t('form:step_edit_form.field.thermocyclerProfile.delete'),
              'capitalize'
            )}
          </StyledText>
        </Btn>
        <PrimaryButton
          onClick={handleSaveCycle}
          disabled={isStepStateError}
          borderRadius={BORDERS.borderRadiusFull}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {i18n.format(t('save'), 'capitalize')}
          </StyledText>
        </PrimaryButton>
      </Flex>
    </Flex>
  ) : (
    <Flex
      padding={SPACING.spacing12}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      width="100%"
      backgroundColor={backgroundColor}
      borderRadius={BORDERS.borderRadius4}
      onMouseEnter={() => {
        setHover(true)
      }}
      onMouseLeave={() => {
        setHover(false)
      }}
    >
      <Flex gridGap={SPACING.spacing24} alignItems={ALIGN_CENTER}>
        <StyledText
          desktopStyle="bodyDefaultRegular"
          borderRadius={BORDERS.borderRadius4}
          backgroundColor={`${COLORS.black90}${COLORS.opacity20HexCode}`}
          padding={`${SPACING.spacing2} ${SPACING.spacing8}`}
        >
          {getStepIndex(steps, cycleId ?? '')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {i18n.format(
            t('form:step_edit_form.field.thermocyclerProfile.cycles', {
              repetitions,
            }),
            'capitalize'
          )}
        </StyledText>
      </Flex>
      <Flex
        gridGap={SPACING.spacing8}
        css={css`
          box-sizing: border-box;
        `}
      >
        <Btn
          whiteSpace={NO_WRAP}
          textDecoration={TYPOGRAPHY.textDecorationUnderline}
          onClick={() => {
            setShowEditCurrentCycle(true)
            setIsInEdit(true)
          }}
          padding={SPACING.spacing4}
          css={[
            LINK_BUTTON_STYLE,
            css`
              visibility: ${hover ? 'visible' : 'hidden'};
              opacity: ${hover ? 1 : 0};
            `,
          ]}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {i18n.format(t('edit'), 'capitalize')}
          </StyledText>
        </Btn>
        <Flex
          css={css`
            &:hover {
              background-color: ${COLORS.grey40};
            }
          `}
          borderRadius={BORDERS.borderRadius4}
          cursor={CURSOR_POINTER}
          onClick={handleDeleteCycle}
        >
          <Icon name="close" size="1.5rem" />
        </Flex>
      </Flex>
    </Flex>
  )
  const bodyContent = (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      alignItems={ALIGN_FLEX_END}
      padding={SPACING.spacing12}
      onMouseEnter={() => {
        setHover(true)
      }}
      onMouseLeave={() => {
        setHover(false)
      }}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        width="100%"
      >
        {orderedCycleStepIds.map((cycleStepId, cycleStepIndex) => {
          const stepState = cycleStepsById[cycleStepId]
          return showEdit ? (
            <Flex
              key={cycleStepId}
              gridGap={SPACING.spacing24}
              backgroundColor={COLORS.grey10}
              padding={SPACING.spacing12}
              borderRadius={BORDERS.borderRadius4}
            >
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing4}
                width="33%"
              >
                <InputField
                  title={i18n.format(
                    t('form:step_edit_form.field.thermocyclerProfile.name'),
                    'capitalize'
                  )}
                  value={stepState.name.value}
                  onChange={(e: ChangeEvent<any>) => {
                    handleValueUpdate(
                      cycleStepId,
                      'name',
                      e.target.value as string
                    )
                  }}
                />
              </Flex>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing4}
                width="33%"
              >
                <InputField
                  title={i18n.format(
                    t(
                      'form:step_edit_form.field.thermocyclerState.block.temperature'
                    ),
                    'capitalize'
                  )}
                  units={t('units.degrees')}
                  value={stepState.temp.value}
                  onChange={(e: ChangeEvent<any>) => {
                    handleValueUpdate(
                      cycleStepId,
                      'temp',
                      maskToFloat(e.target.value),
                      temperatureRangeFieldValue(4, 96)
                    )
                  }}
                  onBlur={() => {
                    setCycleStepsById({
                      ...cycleStepsById,
                      [cycleStepId]: {
                        ...stepState,
                        temp: {
                          ...stepState.temp,
                          wasAccessed: true,
                        },
                      },
                    })
                  }}
                  error={
                    stepState.temp.wasAccessed ? stepState.temp.error : null
                  }
                />
              </Flex>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing4}
                width="33%"
              >
                <InputField
                  title={i18n.format(
                    t('form:step_edit_form.field.thermocyclerProfile.time'),
                    'capitalize'
                  )}
                  units={t('units.time')}
                  value={stepState.time.value}
                  onChange={(e: ChangeEvent<any>) => {
                    handleValueUpdate(
                      cycleStepId,
                      'time',
                      maskToTime(e.target.value),
                      isTimeFormatMinutesSeconds
                    )
                  }}
                  onBlur={() => {
                    setCycleStepsById({
                      ...cycleStepsById,
                      [cycleStepId]: {
                        ...stepState,
                        time: {
                          ...stepState.time,
                          wasAccessed: true,
                        },
                      },
                    })
                  }}
                  error={
                    stepState.time.wasAccessed ? stepState.time.error : null
                  }
                />
              </Flex>
              <Flex
                css={css`
                  &:hover {
                    background-color: ${COLORS.grey40};
                  }
                `}
                borderRadius={BORDERS.borderRadius4}
                cursor={CURSOR_POINTER}
                onClick={() => {
                  handleDeleteStep(cycleStepId)
                }}
                alignSelf={ALIGN_CENTER}
              >
                <Icon name="close" size="1.5rem" />
              </Flex>
            </Flex>
          ) : (
            <Flex
              key={cycleStepId}
              gridGap={SPACING.spacing24}
              backgroundColor={COLORS.grey10}
              padding={SPACING.spacing12}
              borderRadius={BORDERS.borderRadius4}
            >
              <StyledText
                desktopStyle="bodyDefaultRegular"
                backgroundColor={COLORS.grey40}
                padding={`${SPACING.spacing2} ${SPACING.spacing8} `}
                borderRadius={BORDERS.borderRadius4}
              >{`${getStepIndex(steps, cycleId ?? '')}.${
                cycleStepIndex + 1
              }`}</StyledText>
              <StyledText desktopStyle="bodyDefaultRegular">{`${
                stepState.name.value
              }, ${stepState.temp.value}${t('units.degrees')}, ${
                stepState.time.value
              }, `}</StyledText>
            </Flex>
          )
        })}
      </Flex>
      {showEdit ? (
        <>
          <Btn
            onClick={handleAddCycleStep}
            whiteSpace={NO_WRAP}
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            padding={SPACING.spacing4}
            css={LINK_BUTTON_STYLE}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {i18n.format(
                t(
                  'form:step_edit_form.field.thermocyclerProfile.add_cycle_step'
                ),
                'capitalize'
              )}
            </StyledText>
          </Btn>
          <InputField
            title={i18n.format(
              t(
                'form:step_edit_form.field.thermocyclerProfile.number_of_cycles'
              ),
              'capitalize'
            )}
            value={repetitions}
            onChange={e => {
              setRepetitions(maskToInteger(e.target.value))
            }}
          />
        </>
      ) : null}
    </Flex>
  )

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      backgroundColor={backgroundColor}
      borderRadius={BORDERS.borderRadius4}
    >
      {header}
      {bodyContent}
    </Flex>
  )
}
