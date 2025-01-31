import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  Modal,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  Btn,
  JUSTIFY_END,
  SecondaryButton,
  PrimaryButton,
  StyledText,
  Banner,
  InputField,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getIsTouchTipField } from '../../form-types'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { getMainPagePortalEl } from '../Portal'
import { TOO_MANY_DECIMALS, PERCENT_RANGE_TO_SHOW_WARNING } from './constants'
import * as utils from './utils'
import { TipPositionTopView } from './TipPositionTopView'
import { TipPositionSideView } from './TipPositionSideView'

import type { ChangeEvent } from 'react'
import type { StepFieldName } from '../../form-types'

type Offset = 'x' | 'y' | 'z'
interface PositionSpec {
  name: StepFieldName
  value: number | null
  updateValue: (val?: number | null) => void
}
export type PositionSpecs = Record<Offset, PositionSpec>

interface TipPositionModalProps {
  closeModal: () => void
  specs: PositionSpecs
  wellDepthMm: number
  wellXWidthMm: number
  wellYWidthMm: number
  isIndeterminate?: boolean
  prefix: 'aspirate' | 'dispense' | 'mix'
}

export function TipPositionModal(
  props: TipPositionModalProps
): JSX.Element | null {
  const {
    isIndeterminate,
    specs,
    wellDepthMm,
    wellXWidthMm,
    wellYWidthMm,
    closeModal,
    prefix,
  } = props
  const { t } = useTranslation([
    'modal',
    'button',
    'tooltip',
    'shared',
    'application',
  ])
  const [view, setView] = useState<'top' | 'side'>('side')
  const zSpec = specs.z
  const ySpec = specs.y
  const xSpec = specs.x

  if (zSpec == null || xSpec == null || ySpec == null) {
    console.error(
      'expected to find specs for one of the positions but could not'
    )
  }

  const defaultMmFromBottom = utils.getDefaultMmFromEdge({
    name: zSpec.name,
  })

  const [zValue, setZValue] = useState<string | null>(
    zSpec?.value == null ? String(defaultMmFromBottom) : String(zSpec?.value)
  )
  const [yValue, setYValue] = useState<string | null>(
    ySpec?.value == null ? null : String(ySpec?.value)
  )
  const [xValue, setXValue] = useState<string | null>(
    xSpec?.value == null ? null : String(xSpec?.value)
  )

  // in this modal, pristinity hides the OUT_OF_BOUNDS error only.
  const [isPristine, setPristine] = useState<boolean>(true)
  const getMinMaxMmFromBottom = (): {
    maxMmFromBottom: number
    minMmFromBottom: number
  } => {
    if (getIsTouchTipField(zSpec?.name ?? '')) {
      return {
        maxMmFromBottom: utils.roundValue(wellDepthMm, 'up'),
        minMmFromBottom: utils.roundValue(wellDepthMm / 2, 'up'),
      }
    }
    return {
      maxMmFromBottom: utils.roundValue(wellDepthMm, 'up'),
      minMmFromBottom: 0,
    }
  }

  const { maxMmFromBottom, minMmFromBottom } = getMinMaxMmFromBottom()
  const { minValue: yMinWidth, maxValue: yMaxWidth } = utils.getMinMaxWidth(
    wellYWidthMm
  )
  const { minValue: xMinWidth, maxValue: xMaxWidth } = utils.getMinMaxWidth(
    wellXWidthMm
  )

  const createErrors = (
    value: string | null,
    min: number,
    max: number
  ): utils.Error[] => {
    return utils.getErrors({ minMm: min, maxMm: max, value })
  }
  const zErrors = createErrors(zValue, minMmFromBottom, maxMmFromBottom)
  const xErrors = createErrors(xValue, xMinWidth, xMaxWidth)
  const yErrors = createErrors(yValue, yMinWidth, yMaxWidth)

  const hasErrors =
    zErrors.length > 0 || xErrors.length > 0 || yErrors.length > 0
  const hasVisibleErrors = isPristine
    ? zErrors.includes(TOO_MANY_DECIMALS) ||
      xErrors.includes(TOO_MANY_DECIMALS) ||
      yErrors.includes(TOO_MANY_DECIMALS)
    : hasErrors

  const createErrorText = (
    errors: utils.Error[],
    min: number,
    max: number
  ): string | null => {
    return utils.getErrorText({ errors, minMm: min, maxMm: max, isPristine, t })
  }

  const roundedXMin = utils.roundValue(xMinWidth, 'up')
  const roundedYMin = utils.roundValue(yMinWidth, 'up')
  const roundedXMax = utils.roundValue(xMaxWidth, 'down')
  const roundedYMax = utils.roundValue(yMaxWidth, 'down')

  const zErrorText = createErrorText(zErrors, minMmFromBottom, maxMmFromBottom)
  const xErrorText = createErrorText(xErrors, roundedXMin, roundedXMax)
  const yErrorText = createErrorText(yErrors, roundedYMin, roundedYMax)

  const handleDone = (): void => {
    if (!hasErrors) {
      zSpec?.updateValue(zValue === null ? null : Number(zValue))
      xSpec?.updateValue(xValue === null ? null : Number(xValue))
      ySpec?.updateValue(yValue === null ? null : Number(yValue))
      closeModal()
    }
  }

  const handleCancel = (): void => {
    closeModal()
  }

  const handleZChange = (newValueRaw: string | number): void => {
    // if string, strip non-number characters from string and cast to number
    const newValue =
      typeof newValueRaw === 'string'
        ? newValueRaw.replace(/[^.0-9]/, '')
        : String(newValueRaw)

    if (newValue === '.') {
      setZValue('0.')
    } else {
      setZValue(Number(newValue) >= 0 ? newValue : '0')
    }
  }

  const handleZInputFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
    handleZChange(e.currentTarget.value)
    setPristine(false)
  }

  const handleXChange = (newValueRaw: string | number): void => {
    // if string, strip non-number characters from string and cast to number
    const newValue =
      typeof newValueRaw === 'string'
        ? newValueRaw.replace(/[^-.0-9]/g, '')
        : String(newValueRaw)

    if (newValue === '.') {
      setXValue('0.')
    } else {
      setXValue(newValue)
    }
  }

  const handleXInputFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
    handleXChange(e.currentTarget.value)
    setPristine(false)
  }

  const handleYChange = (newValueRaw: string | number): void => {
    // if string, strip non-number characters from string and cast to number
    const newValue =
      typeof newValueRaw === 'string'
        ? newValueRaw.replace(/[^-.0-9]/g, '')
        : String(newValueRaw)

    if (newValue === '.') {
      setYValue('0.')
    } else {
      setYValue(newValue)
    }
  }

  const handleYInputFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
    handleYChange(e.currentTarget.value)
    setPristine(false)
  }
  const isXValueNearEdge =
    xValue != null &&
    (parseInt(xValue) > PERCENT_RANGE_TO_SHOW_WARNING * xMaxWidth ||
      parseInt(xValue) < PERCENT_RANGE_TO_SHOW_WARNING * xMinWidth)
  const isYValueNearEdge =
    yValue != null &&
    (parseInt(yValue) > PERCENT_RANGE_TO_SHOW_WARNING * yMaxWidth ||
      parseInt(yValue) < PERCENT_RANGE_TO_SHOW_WARNING * yMinWidth)
  const isZValueAtBottom = zValue != null && zValue === '0'

  return createPortal(
    <Modal
      marginLeft="0"
      type="info"
      width="37.125rem"
      closeOnOutsideClick
      title={t('shared:tip_position', { prefix })}
      onClose={handleCancel}
      footer={
        <Flex
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          padding={SPACING.spacing24}
          alignItems={ALIGN_CENTER}
        >
          <Btn
            onClick={() => {
              setXValue('0')
              setYValue('0')
              setZValue('1')
            }}
            css={LINK_BUTTON_STYLE}
          >
            {t('shared:reset_to_default')}
          </Btn>
          <Flex gridGap={SPACING.spacing8} justifyContent={JUSTIFY_END}>
            <SecondaryButton onClick={handleCancel}>
              {t('shared:cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={handleDone} disabled={hasVisibleErrors}>
              {t('shared:save')}
            </PrimaryButton>
          </Flex>
        </Flex>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        {isXValueNearEdge || isYValueNearEdge || isZValueAtBottom ? (
          <Banner type="warning">
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('tip_position.warning')}
            </StyledText>
          </Banner>
        ) : null}
        <Flex gridGap={SPACING.spacing40}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t(`tip_position.body.${zSpec?.name}`)}
            </StyledText>
            <InputField
              title={t('tip_position.field_titles.x_position')}
              caption={t('tip_position.caption', {
                min: roundedXMin,
                max: roundedXMax,
              })}
              error={xErrorText}
              id="TipPositionModal_x_custom_input"
              onChange={handleXInputFieldChange}
              units={t('application:units.millimeter')}
              value={xValue ?? ''}
            />
            <InputField
              tooltipText={t('tooltip:y_position_value')}
              title={t('tip_position.field_titles.y_position')}
              caption={t('tip_position.caption', {
                min: roundedYMin,
                max: roundedYMax,
              })}
              error={yErrorText}
              id="TipPositionModal_y_custom_input"
              onChange={handleYInputFieldChange}
              units={t('application:units.millimeter')}
              value={yValue ?? ''}
            />
            <InputField
              title={t('tip_position.field_titles.z_position')}
              caption={t('tip_position.caption', {
                min: minMmFromBottom,
                max: maxMmFromBottom,
              })}
              error={zErrorText}
              id="TipPositionModal_z_custom_input"
              isIndeterminate={zValue === null && isIndeterminate}
              onChange={handleZInputFieldChange}
              units={t('application:units.millimeter')}
              value={zValue !== null ? zValue : ''}
            />
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
            <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {view === 'side' ? 'Side view' : 'Top view'}
              </StyledText>
              <Btn
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                css={LINK_BUTTON_STYLE}
                onClick={() => {
                  setView(view === 'side' ? 'top' : 'side')
                }}
              >
                {t('shared:swap_view')}
              </Btn>
            </Flex>
            {view === 'side' ? (
              <TipPositionSideView
                mmFromBottom={
                  zValue !== null ? Number(zValue) : defaultMmFromBottom
                }
                wellDepthMm={wellDepthMm}
                xPosition={parseInt(xValue ?? '0')}
                xWidthMm={wellXWidthMm}
              />
            ) : (
              <TipPositionTopView
                xPosition={parseInt(xValue ?? '0')}
                xWidthMm={wellXWidthMm}
                yPosition={parseInt(yValue ?? '0')}
                yWidthMm={wellYWidthMm}
              />
            )}
          </Flex>
        </Flex>
      </Flex>
    </Modal>,
    getMainPagePortalEl()
  )
}
