import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  DIRECTION_COLUMN,
  Divider,
  Flex,
  SPACING,
  StyledText,
  Tabs,
} from '@opentrons/components'
import {
  CheckboxExpandStepFormField,
  InputStepFormField,
} from '../../../../molecules'
import {
  getBlowoutLocationOptionsForForm,
  getLabwareFieldForPositioningField,
} from '../StepForm/utils'
import {
  BlowoutLocationField,
  BlowoutOffsetField,
  FlowRateField,
  PositionField,
  WellsOrderField,
} from '../StepForm/PipetteFields'
import type { WellOrderOption } from '../../../../form-types'
import type { FieldPropsByName } from '../StepForm/types'

interface BatchEditMoveLiquidProps {
  propsForFields: FieldPropsByName
}

export function BatchEditMoveLiquidTools(
  props: BatchEditMoveLiquidProps
): JSX.Element {
  const { t, i18n } = useTranslation(['button', 'tooltip', 'protocol_steps'])
  const { propsForFields } = props
  const [tab, setTab] = useState<'aspirate' | 'dispense'>('aspirate')
  const aspirateTab = {
    text: t('protocol_steps:aspirate'),
    isActive: tab === 'aspirate',
    onClick: () => {
      setTab('aspirate')
    },
  }
  const dispenseTab = {
    text: t('protocol_steps:dispense'),

    isActive: tab === 'dispense',
    onClick: () => {
      setTab('dispense')
    },
  }
  const addFieldNamePrefix = (name: string): string => `${tab}_${name}`
  const getPipetteIdForForm = (): string | null => {
    const pipetteId = propsForFields.pipette?.value
    return pipetteId ? String(pipetteId) : null
  }
  const getLabwareIdForPositioningField = (name: string): string | null => {
    const labwareField = getLabwareFieldForPositioningField(name)
    const labwareId = propsForFields[labwareField]?.value
    return labwareId ? String(labwareId) : null
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="100%"
      gridGap={SPACING.spacing12}
    >
      <Flex padding={SPACING.spacing16}>
        <Tabs tabs={[aspirateTab, dispenseTab]} />
      </Flex>
      <Divider marginY="0" />
      <Flex width="100%">
        <FlowRateField
          {...propsForFields[addFieldNamePrefix('flowRate')]}
          pipetteId={getPipetteIdForForm()}
          flowRateType={tab}
          volume={propsForFields.volume?.value ?? 0}
          tiprack={propsForFields.tipRack.value}
        />
      </Flex>
      <Divider marginY="0" />
      <WellsOrderField
        prefix={tab}
        updateFirstWellOrder={
          propsForFields[addFieldNamePrefix('wellOrder_first')].updateValue
        }
        updateSecondWellOrder={
          propsForFields[addFieldNamePrefix('wellOrder_second')].updateValue
        }
        firstValue={
          (propsForFields.wellOrder_first?.value ?? 't2b') as WellOrderOption
        }
        secondValue={
          (propsForFields.wellOrder_second?.value ?? 'l2r') as WellOrderOption
        }
        firstName={addFieldNamePrefix('wellOrder_first')}
        secondName={addFieldNamePrefix('wellOrder_second')}
      />
      <Divider marginY="0" />
      <PositionField
        prefix={tab}
        propsForFields={propsForFields}
        zField={`${tab}_mmFromBottom`}
        xField={`${tab}_x_position`}
        yField={`${tab}_y_position`}
        labwareId={getLabwareIdForPositioningField(
          addFieldNamePrefix('mmFromBottom')
        )}
      />
      <Divider marginY="0" />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`0 ${SPACING.spacing16}`}
        gridGap={SPACING.spacing8}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('protocol_steps:advanced_settings')}
        </StyledText>
        {tab === 'aspirate' ? (
          <CheckboxExpandStepFormField
            title={i18n.format(
              t('form:step_edit_form.field.preWetTip.label'),
              'capitalize'
            )}
            checkboxValue={propsForFields.preWetTip.value}
            isChecked={propsForFields.preWetTip.value === true}
            checkboxUpdateValue={propsForFields.preWetTip.updateValue}
          />
        ) : null}
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.mix.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_mix_checkbox`].value}
          isChecked={propsForFields[`${tab}_mix_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_mix_checkbox`].updateValue
          }
        >
          {propsForFields[`${tab}_mix_checkbox`].value === true ? (
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing6}
              width="100^"
            >
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:mix_volume')}
                {...propsForFields[`${tab}_mix_volume`]}
                units={t('application:units.microliter')}
              />
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:mix_times')}
                {...propsForFields[`${tab}_mix_times`]}
                units={t('application:units.times')}
              />
            </Flex>
          ) : null}
        </CheckboxExpandStepFormField>
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.delay.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_delay_checkbox`].value}
          isChecked={propsForFields[`${tab}_delay_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_delay_checkbox`].updateValue
          }
        >
          {propsForFields[`${tab}_delay_checkbox`].value === true ? (
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing6}
              width="100^"
            >
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:delay_duration')}
                {...propsForFields[`${tab}_delay_seconds`]}
                units={t('application:units.seconds')}
              />
              <PositionField
                prefix={tab}
                propsForFields={propsForFields}
                zField={`${tab}_delay_mmFromBottom`}
                labwareId={getLabwareIdForPositioningField(
                  addFieldNamePrefix('delay_mmFromBottom')
                )}
              />
            </Flex>
          ) : null}
        </CheckboxExpandStepFormField>
        {tab === 'dispense' ? (
          <CheckboxExpandStepFormField
            title={i18n.format(
              t('form:step_edit_form.field.blowout.label'),
              'capitalize'
            )}
            checkboxValue={propsForFields.blowout_checkbox.value}
            isChecked={propsForFields.blowout_checkbox.value === true}
            checkboxUpdateValue={propsForFields.blowout_checkbox.updateValue}
          >
            {propsForFields.blowout_checkbox.value === true ? (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing6}
                width="100^"
              >
                <BlowoutLocationField
                  {...propsForFields.blowout_location}
                  options={getBlowoutLocationOptionsForForm({
                    path: propsForFields.path.value as any,
                    stepType: 'moveLiquid',
                  })}
                  padding="0"
                />
                <FlowRateField
                  {...propsForFields.blowout_flowRate}
                  pipetteId={getPipetteIdForForm()}
                  flowRateType="blowout"
                  volume={propsForFields.volume?.value ?? 0}
                  tiprack={propsForFields.tipRack.value}
                  padding="0"
                />
                <BlowoutOffsetField
                  {...propsForFields.blowout_z_offset}
                  sourceLabwareId={propsForFields.aspirate_labware.value}
                  destLabwareId={propsForFields.dispense_labware.value}
                  blowoutLabwareId={propsForFields.blowout_location.value}
                />
              </Flex>
            ) : null}
          </CheckboxExpandStepFormField>
        ) : null}
      </Flex>
    </Flex>
  )
}
