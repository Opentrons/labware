import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SPACING } from '@opentrons/components'
import { selectors as stepFormSelectors } from '../../../../../step-forms'
import { getMatchingTipLiquidSpecs } from '../../../../../utils'
import { InputStepFormField } from '../../../../../molecules'
import type { FieldProps } from '../types'

interface FlowRateFieldProps extends FieldProps {
  flowRateType: 'aspirate' | 'dispense' | 'blowout'
  volume: unknown
  tiprack: unknown
  pipetteId?: string | null
  showTooltip?: boolean
}

export function FlowRateField(props: FlowRateFieldProps): JSX.Element {
  const {
    pipetteId,
    flowRateType,
    volume,
    tiprack,
    name,
    tooltipContent,
    padding = `0 ${SPACING.spacing16}`,
    ...passThruProps
  } = props
  const { t, i18n } = useTranslation(['form', 'application', 'protocol_steps'])
  const [isPristine, setIsPristine] = useState<boolean>(true)
  const pipetteEntities = useSelector(stepFormSelectors.getPipetteEntities)
  const pipette = pipetteId != null ? pipetteEntities[pipetteId] : null
  const matchingTipLiquidSpecs =
    pipette != null
      ? getMatchingTipLiquidSpecs(pipette, volume as number, tiprack as string)
      : null

  let defaultFlowRate = 0
  if (pipette) {
    if (flowRateType === 'aspirate') {
      defaultFlowRate =
        matchingTipLiquidSpecs?.defaultAspirateFlowRate.default ?? 0
    } else if (flowRateType === 'dispense') {
      defaultFlowRate =
        matchingTipLiquidSpecs?.defaultDispenseFlowRate.default ?? 0
    } else if (flowRateType === 'blowout') {
      defaultFlowRate =
        matchingTipLiquidSpecs?.defaultBlowOutFlowRate.default ?? 0
    }
  }

  const title = i18n.format(
    t('protocol_steps:flow_type_title', { type: flowRateType }),
    'capitalize'
  )

  const flowRateNum = Number(passThruProps.value)
  const maxFlowRate = matchingTipLiquidSpecs?.uiMaxFlowRate ?? Infinity

  const outOfBounds = flowRateNum > maxFlowRate || flowRateNum < 0

  let errorMessage: string | null = null
  if (
    (!isPristine && passThruProps.value !== undefined && flowRateNum === 0) ||
    outOfBounds ||
    (isPristine && flowRateNum === 0)
  ) {
    errorMessage = i18n.format(
      t('step_edit_form.field.flow_rate.error_out_of_bounds', {
        min: 0.1,
        max: maxFlowRate,
      }),
      'capitalize'
    )
  }

  useEffect(() => {
    if (isPristine && passThruProps.value == null) {
      passThruProps.updateValue(defaultFlowRate)
    }
  }, [isPristine, passThruProps])

  return (
    <InputStepFormField
      {...passThruProps}
      padding={padding}
      type="number"
      setIsPristine={setIsPristine}
      errorToShow={errorMessage}
      key={`${flowRateType}_FlowRateInput`}
      title={title}
      showTooltip={false}
      name={name}
      units={t('application:units.microliterPerSec')}
      caption={t('protocol_steps:valid_range', {
        min: 0.1,
        max: maxFlowRate,
        unit: t('application:units.microliterPerSec'),
      })}
      placeholder={String(defaultFlowRate)}
    />
  )
}
