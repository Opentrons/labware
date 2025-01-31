import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation } from 'react-router-dom'
import {
  FLEX_ROBOT_TYPE,
  getAllPipetteNames,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'
import {
  ALIGN_CENTER,
  ALIGN_STRETCH,
  Box,
  Btn,
  Checkbox,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  DISPLAY_INLINE_BLOCK,
  EmptySelectorButton,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_AUTO,
  PRODUCT,
  RadioButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  WRAP,
} from '@opentrons/components'
import { getAllowAllTipracks } from '../../feature-flags/selectors'
import { getLabwareDefsByURI } from '../../labware-defs/selectors'
import { setFeatureFlags } from '../../feature-flags/actions'
import { createCustomTiprackDef } from '../../labware-defs/actions'
import { useKitchen } from '../../organisms/Kitchen/hooks'
import { IncompatibleTipsModal, PipetteInfoItem } from '../../organisms'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { WizardBody } from './WizardBody'
import { PIPETTE_GENS, PIPETTE_TYPES, PIPETTE_VOLUMES } from './constants'
import { getTiprackOptions } from './utils'
import { HandleEnter } from '../../atoms/HandleEnter'
import { removeOpentronsPhrases } from '../../utils'

import type { ThunkDispatch } from 'redux-thunk'
import type { PipetteMount, PipetteName } from '@opentrons/shared-data'
import type { BaseState } from '../../types'
import type {
  Gen,
  PipetteInfoByGen,
  PipetteInfoByType,
  PipetteType,
  WizardTileProps,
} from './types'

const MAX_TIPRACKS_ALLOWED = 3

export function SelectPipettes(props: WizardTileProps): JSX.Element | null {
  const { goBack, proceed, watch, setValue } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const location = useLocation()
  const pipettesByMount = watch('pipettesByMount')
  const fields = watch('fields')
  const { makeSnackbar } = useKitchen()
  const allLabware = useSelector(getLabwareDefsByURI)
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const [mount, setMount] = useState<PipetteMount>('left')
  const [page, setPage] = useState<'add' | 'overview'>('add')
  const [pipetteType, setPipetteType] = useState<PipetteType | null>(null)
  const [showIncompatibleTip, setIncompatibleTip] = useState<boolean>(false)
  const [pipetteGen, setPipetteGen] = useState<Gen | 'flex'>('flex')
  const [pipetteVolume, setPipetteVolume] = useState<string | null>(null)
  const allowAllTipracks = useSelector(getAllowAllTipracks)
  const allPipetteOptions = getAllPipetteNames('maxVolume', 'channels')
  const robotType = fields.robotType
  const has96Channel = pipettesByMount.left.pipetteName === 'p1000_96'
  const selectedPipetteName =
    pipetteType === '96' || pipetteGen === 'GEN1'
      ? `${pipetteVolume}_${pipetteType}`
      : `${pipetteVolume}_${pipetteType}_${pipetteGen.toLowerCase()}`

  const selectedValues = pipettesByMount[mount].tiprackDefURI ?? []

  const resetFields = (): void => {
    setPipetteType(null)
    setPipetteGen('flex')
    setPipetteVolume(null)
  }

  const ref = useRef<HTMLDivElement | null>(null)

  const handleScrollToBottom = (): void => {
    if (ref.current != null) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }
  }

  useEffect(() => {
    handleScrollToBottom()
  }, [pipetteType, pipetteVolume, pipetteGen])

  const noPipette =
    (pipettesByMount.left.pipetteName == null ||
      pipettesByMount.left.tiprackDefURI == null) &&
    (pipettesByMount.right.pipetteName == null ||
      pipettesByMount.right.tiprackDefURI == null)

  const isDisabled =
    (page === 'add' &&
      pipettesByMount[mount].tiprackDefURI == null &&
      noPipette) ||
    (pipettesByMount.left.tiprackDefURI == null &&
      pipettesByMount.right.tiprackDefURI == null)

  const targetPipetteMount =
    pipettesByMount.left.pipetteName == null ||
    pipettesByMount.left.tiprackDefURI == null
      ? 'left'
      : 'right'

  const handleProceed = (): void => {
    if (!isDisabled) {
      if (page === 'overview') {
        proceed(1)
      } else {
        setPage('overview')
        setValue(`pipettesByMount.${mount}.pipetteName`, selectedPipetteName)
      }
    }
  }

  const handleGoBack = (): void => {
    if (page === 'add') {
      resetFields()
      setValue(`pipettesByMount.${mount}.pipetteName`, undefined)
      setValue(`pipettesByMount.${mount}.tiprackDefURI`, undefined)
      if (
        pipettesByMount.left.pipetteName != null ||
        pipettesByMount.left.tiprackDefURI != null ||
        pipettesByMount.right.pipetteName != null ||
        pipettesByMount.right.tiprackDefURI != null
      ) {
        setPage('overview')
      } else {
        goBack(1)
      }
    }
    if (page === 'overview') {
      setPage('add')
    }
  }

  useEffect(() => {
    if (location.state === 'gripper') {
      setPage('overview')
    }
  }, [location])

  const hasAPipette =
    (mount === 'left' && pipettesByMount.right.pipetteName != null) ||
    (mount === 'right' && pipettesByMount.left.pipetteName != null)
  let subHeader
  if (page === 'add' && noPipette) {
    subHeader = t('which_pipette')
  } else if (page === 'add' && hasAPipette) {
    subHeader = t('which_pipette_second')
  }

  return (
    <>
      {showIncompatibleTip ? (
        <IncompatibleTipsModal
          onClose={() => {
            setIncompatibleTip(false)
          }}
        />
      ) : null}
      <HandleEnter onEnter={handleProceed}>
        <WizardBody
          robotType={robotType}
          stepNumber={2}
          header={page === 'add' ? t('add_pipette') : t('robot_pipettes')}
          subHeader={subHeader}
          proceed={handleProceed}
          goBack={() => {
            handleGoBack()
          }}
          disabled={isDisabled}
          tooltipOnDisabled={t('add_pipette_to_continue')}
        >
          {page === 'add' ? (
            <Flex
              flexDirection={DIRECTION_COLUMN}
              overflowY={OVERFLOW_AUTO}
              gridGap={SPACING.spacing32}
              ref={ref}
            >
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing12}
              >
                <StyledText desktopStyle="headingSmallBold">
                  {t('pipette_type')}
                </StyledText>
                <Flex gridGap={SPACING.spacing4} flexWrap={WRAP}>
                  {PIPETTE_TYPES[robotType].map(type => {
                    return type.value === '96' &&
                      (mount === 'right' ||
                        (mount === 'left' &&
                          pipettesByMount.right.pipetteName != null)) ? null : (
                      <RadioButton
                        key={`${type.label}_${type.value}`}
                        onChange={() => {
                          setPipetteType(type.value)
                          setPipetteGen('flex')
                          setPipetteVolume(null)
                          setValue(
                            `pipettesByMount.${mount}.pipetteName`,
                            undefined
                          )
                          setValue(
                            `pipettesByMount.${mount}.tiprackDefURI`,
                            undefined
                          )
                        }}
                        buttonLabel={t(`shared:${type.label}`)}
                        buttonValue="single"
                        isSelected={pipetteType === type.value}
                      />
                    )
                  })}
                </Flex>
              </Flex>

              {pipetteType != null && robotType === OT2_ROBOT_TYPE ? (
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing12}
                  flexWrap={WRAP}
                >
                  <StyledText desktopStyle="headingSmallBold">
                    {t('pipette_gen')}
                  </StyledText>
                  <Flex gridGap={SPACING.spacing4}>
                    {PIPETTE_GENS.map(gen => (
                      <RadioButton
                        key={gen}
                        onChange={() => {
                          setPipetteGen(gen)
                          setPipetteVolume(null)
                        }}
                        buttonLabel={gen}
                        buttonValue={gen}
                        isSelected={pipetteGen === gen}
                      />
                    ))}
                  </Flex>
                </Flex>
              ) : null}
              {(pipetteType != null && robotType === FLEX_ROBOT_TYPE) ||
              (pipetteGen !== 'flex' &&
                pipetteType != null &&
                robotType === OT2_ROBOT_TYPE) ? (
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing12}
                >
                  <StyledText desktopStyle="headingSmallBold">
                    {t('pipette_vol')}
                  </StyledText>
                  <Flex gridGap={SPACING.spacing4} flexWrap={WRAP}>
                    {PIPETTE_VOLUMES[robotType]?.map(volume => {
                      if (
                        robotType === FLEX_ROBOT_TYPE &&
                        pipetteType != null
                      ) {
                        const flexVolume = volume as PipetteInfoByType
                        const flexPipetteInfo = flexVolume[pipetteType]

                        return flexPipetteInfo?.map(type => (
                          <RadioButton
                            key={`${type.value}_${pipetteType}`}
                            onChange={() => {
                              setPipetteVolume(type.value)
                            }}
                            buttonLabel={t('vol_label', { volume: type.label })}
                            buttonValue={type.value}
                            isSelected={pipetteVolume === type.value}
                          />
                        ))
                      } else {
                        const ot2Volume = volume as PipetteInfoByGen
                        //  asserting gen is defined from previous turnary statement
                        const gen = pipetteGen as Gen

                        return ot2Volume[gen].map(info => {
                          return info[pipetteType]?.map(type => (
                            <RadioButton
                              key={`${type.value}_${pipetteGen}_${pipetteType}`}
                              onChange={() => {
                                setPipetteVolume(type.value)
                              }}
                              buttonLabel={t('vol_label', {
                                volume: type.label,
                              })}
                              buttonValue={type.value}
                              isSelected={pipetteVolume === type.value}
                            />
                          ))
                        })
                      }
                    })}
                  </Flex>
                </Flex>
              ) : null}
              {allPipetteOptions.includes(selectedPipetteName as PipetteName)
                ? (() => {
                    const tiprackOptions = getTiprackOptions({
                      allLabware,
                      allowAllTipracks,
                      selectedPipetteName,
                    })
                    return (
                      <Flex
                        flexDirection={DIRECTION_COLUMN}
                        gridGap={SPACING.spacing4}
                      >
                        <Flex
                          flexDirection={DIRECTION_COLUMN}
                          gridGap={SPACING.spacing16}
                        >
                          <StyledText desktopStyle="headingSmallBold">
                            {t('pipette_tips')}
                          </StyledText>
                          <Box
                            css={css`
                              gap: ${SPACING.spacing4};
                              display: ${DISPLAY_FLEX};
                              flex-wrap: ${WRAP};
                              align-items: ${ALIGN_CENTER};
                              align-content: ${ALIGN_CENTER};
                              align-self: ${ALIGN_STRETCH};
                            `}
                          >
                            {Object.entries(tiprackOptions).map(
                              ([value, name]) => (
                                <Checkbox
                                  key={value}
                                  isChecked={selectedValues.includes(value)}
                                  labelText={removeOpentronsPhrases(name)}
                                  onClick={() => {
                                    const isCurrentlySelected = selectedValues.includes(
                                      value
                                    )

                                    if (isCurrentlySelected) {
                                      setValue(
                                        `pipettesByMount.${mount}.tiprackDefURI`,
                                        selectedValues.filter(v => v !== value)
                                      )
                                    } else {
                                      if (
                                        selectedValues.length ===
                                        MAX_TIPRACKS_ALLOWED
                                      ) {
                                        makeSnackbar(
                                          t('up_to_3_tipracks') as string
                                        )
                                      } else {
                                        setValue(
                                          `pipettesByMount.${mount}.tiprackDefURI`,
                                          [...selectedValues, value]
                                        )
                                      }
                                    }
                                  }}
                                />
                              )
                            )}
                            <StyledLabel>
                              <StyledText
                                desktopStyle="bodyDefaultRegular"
                                padding={SPACING.spacing4}
                              >
                                {t('add_custom_tips')}
                              </StyledText>
                              <input
                                data-testid="SelectPipettes_customTipInput"
                                type="file"
                                onChange={e =>
                                  dispatch(createCustomTiprackDef(e))
                                }
                              />
                            </StyledLabel>
                            {pipetteVolume === 'p1000' &&
                            robotType === FLEX_ROBOT_TYPE ? null : (
                              <Btn
                                onClick={() => {
                                  if (allowAllTipracks) {
                                    dispatch(
                                      setFeatureFlags({
                                        OT_PD_ALLOW_ALL_TIPRACKS: !allowAllTipracks,
                                      })
                                    )
                                  } else {
                                    setIncompatibleTip(true)
                                  }
                                }}
                                textDecoration={
                                  TYPOGRAPHY.textDecorationUnderline
                                }
                              >
                                <StyledLabel>
                                  <StyledText
                                    desktopStyle="bodyDefaultRegular"
                                    padding={SPACING.spacing4}
                                  >
                                    {allowAllTipracks
                                      ? t('show_default_tips')
                                      : t('show_all_tips')}
                                  </StyledText>
                                </StyledLabel>
                              </Btn>
                            )}
                          </Box>
                        </Flex>
                      </Flex>
                    )
                  })()
                : null}
            </Flex>
          ) : (
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
              <Flex
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                alignItems={ALIGN_CENTER}
              >
                <StyledText desktopStyle="headingSmallBold">
                  {t('your_pipettes')}
                </StyledText>
                {has96Channel ||
                (pipettesByMount.left.pipetteName == null &&
                  pipettesByMount.right.pipetteName == null) ||
                (pipettesByMount.left.tiprackDefURI == null &&
                  pipettesByMount.right.tiprackDefURI == null) ? null : (
                  <Btn
                    css={LINK_BUTTON_STYLE}
                    onClick={() => {
                      const leftPipetteName = pipettesByMount.left.pipetteName
                      const rightPipetteName = pipettesByMount.right.pipetteName
                      const leftTiprackDefURI =
                        pipettesByMount.left.tiprackDefURI
                      const rightTiprackDefURI =
                        pipettesByMount.right.tiprackDefURI

                      setValue(
                        'pipettesByMount.left.pipetteName',
                        rightPipetteName
                      )
                      setValue(
                        'pipettesByMount.right.pipetteName',
                        leftPipetteName
                      )
                      setValue(
                        'pipettesByMount.left.tiprackDefURI',
                        rightTiprackDefURI
                      )
                      setValue(
                        'pipettesByMount.right.tiprackDefURI',
                        leftTiprackDefURI
                      )
                    }}
                  >
                    <Flex flexDirection={DIRECTION_ROW}>
                      <Icon
                        name="swap-horizontal"
                        size="1rem"
                        transform="rotate(90deg)"
                      />
                      <StyledText desktopStyle="captionSemiBold">
                        {t('swap_pipette_mounts')}
                      </StyledText>
                    </Flex>
                  </Btn>
                )}
              </Flex>
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing4}
                >
                  {pipettesByMount.left.pipetteName != null &&
                  pipettesByMount.left.tiprackDefURI != null ? (
                    <PipetteInfoItem
                      mount="left"
                      pipetteName={
                        pipettesByMount.left.pipetteName as PipetteName
                      }
                      tiprackDefURIs={pipettesByMount.left.tiprackDefURI}
                      editClick={() => {
                        setPage('add')
                        setMount('left')
                      }}
                      cleanForm={() => {
                        setValue(`pipettesByMount.left.pipetteName`, undefined)
                        setValue(
                          `pipettesByMount.left.tiprackDefURI`,
                          undefined
                        )

                        resetFields()
                      }}
                    />
                  ) : null}
                  {pipettesByMount.right.pipetteName != null &&
                  pipettesByMount.right.tiprackDefURI != null ? (
                    <PipetteInfoItem
                      mount="right"
                      pipetteName={
                        pipettesByMount.right.pipetteName as PipetteName
                      }
                      tiprackDefURIs={pipettesByMount.right.tiprackDefURI}
                      editClick={() => {
                        setPage('add')
                        setMount('right')
                      }}
                      cleanForm={() => {
                        setValue(`pipettesByMount.right.pipetteName`, undefined)
                        setValue(
                          `pipettesByMount.right.tiprackDefURI`,
                          undefined
                        )
                        resetFields()
                      }}
                    />
                  ) : null}
                </Flex>
                <>
                  {has96Channel ||
                  (pipettesByMount.left.pipetteName != null &&
                    pipettesByMount.right.pipetteName != null &&
                    pipettesByMount.left.tiprackDefURI != null &&
                    pipettesByMount.right.tiprackDefURI != null) ? null : (
                    <EmptySelectorButton
                      onClick={() => {
                        setPage('add')
                        setMount(targetPipetteMount)
                        resetFields()
                      }}
                      text={t('add_pipette')}
                      textAlignment="left"
                      iconName="plus"
                    />
                  )}
                </>
              </Flex>
            </Flex>
          )}
        </WizardBody>
      </HandleEnter>
    </>
  )
}

const StyledLabel = styled.label`
  text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
  font-size: ${PRODUCT.TYPOGRAPHY.fontSizeBodyDefaultSemiBold};
  display: ${DISPLAY_INLINE_BLOCK};
  cursor: ${CURSOR_POINTER};
  input[type='file'] {
    display: none;
  }
  &:hover {
    color: ${COLORS.blue50};
  }
`
