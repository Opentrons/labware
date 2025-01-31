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
  BlowoutLocationField,
  FlowRateField,
  PositionField,
  WellsOrderField,
} from '../StepForm/PipetteFields'
import {
  getBlowoutLocationOptionsForForm,
  getLabwareFieldForPositioningField,
} from '../StepForm/utils'

import type { WellOrderOption } from '../../../../form-types'
import type { FieldPropsByName } from '../StepForm/types'

interface BatchEditMixToolsProps {
  propsForFields: FieldPropsByName
}

export function BatchEditMixTools(props: BatchEditMixToolsProps): JSX.Element {
  const { propsForFields } = props
  const { t, i18n } = useTranslation(['form', 'button', 'tooltip'])
  const [tab, setTab] = useState<'aspirate' | 'dispense'>('aspirate')
  const aspirateTab = {
    text: i18n.format(t('aspirate'), 'capitalize'),
    isActive: tab === 'aspirate',
    onClick: () => {
      setTab('aspirate')
    },
  }
  const dispenseTab = {
    text: i18n.format(t('dispense'), 'capitalize'),
    isActive: tab === 'dispense',
    onClick: () => {
      setTab('dispense')
    },
  }

  const getLabwareIdForPositioningField = (name: string): string | null => {
    const labwareField = getLabwareFieldForPositioningField(name)
    const labwareId = propsForFields[labwareField]?.value
    return labwareId ? String(labwareId) : null
  }

  const getPipetteIdForForm = (): string | null => {
    const pipetteId = propsForFields.pipette?.value
    return pipetteId ? String(pipetteId) : null
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="100%"
      spacing={SPACING.spacing12}
      gridGap={SPACING.spacing16}
    >
      <Flex padding={`${SPACING.spacing16} ${SPACING.spacing16} 0`}>
        <Tabs tabs={[aspirateTab, dispenseTab]} />
      </Flex>
      <Divider marginY="0" />
      <Flex width="100%">
        <FlowRateField
          {...propsForFields[`${tab}_flowRate`]}
          pipetteId={getPipetteIdForForm()}
          flowRateType={tab}
          volume={propsForFields.volume?.value ?? 0}
          tiprack={propsForFields.tipRack.value}
        />
      </Flex>
      <Divider marginY="0" />
      {tab === 'aspirate' ? (
        <>
          <WellsOrderField
            prefix={tab}
            updateFirstWellOrder={
              propsForFields.mix_wellOrder_first.updateValue
            }
            updateSecondWellOrder={
              propsForFields.mix_wellOrder_second.updateValue
            }
            firstValue={
              (propsForFields.mix_wellOrder_first?.value ??
                't2b') as WellOrderOption
            }
            secondValue={
              (propsForFields.mix_wellOrder_second?.value ??
                'l2r') as WellOrderOption
            }
            firstName="mix_wellOrder_first"
            secondName="mix_wellOrder_second"
          />
          <Divider marginY="0" />
          <PositionField
            prefix="mix"
            propsForFields={propsForFields}
            zField="mix_mmFromBottom"
            xField="mix_x_position"
            yField="mix_y_position"
            labwareId={getLabwareIdForPositioningField('mix_mmFromBottom')}
          />
          <Divider marginY="0" />
        </>
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`0 ${SPACING.spacing16}`}
        gridGap={SPACING.spacing8}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('protocol_steps:advanced_settings')}
        </StyledText>
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
            <InputStepFormField
              showTooltip={false}
              padding="0"
              title={t('protocol_steps:delay_duration')}
              {...propsForFields[`${tab}_delay_seconds`]}
              units={t('application:units.seconds')}
            />
          ) : null}
        </CheckboxExpandStepFormField>
        {tab === 'dispense' ? (
          <>
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
                <BlowoutLocationField
                  {...propsForFields.blowout_location}
                  options={getBlowoutLocationOptionsForForm({
                    stepType: 'mix',
                  })}
                  padding="0"
                />
              ) : null}
            </CheckboxExpandStepFormField>
            <CheckboxExpandStepFormField
              title={i18n.format(
                t('form:step_edit_form.field.touchTip.label'),
                'capitalize'
              )}
              checkboxValue={propsForFields.mix_touchTip_checkbox.value}
              isChecked={propsForFields.mix_touchTip_checkbox.value === true}
              checkboxUpdateValue={
                propsForFields.mix_touchTip_checkbox.updateValue
              }
            >
              {propsForFields.mix_touchTip_checkbox.value === true ? (
                <PositionField
                  prefix="dispense"
                  propsForFields={propsForFields}
                  zField="mix_touchTip_mmFromTop"
                  labwareId={getLabwareIdForPositioningField(
                    'mix_touchTip_mmFromTop'
                  )}
                />
              ) : null}
            </CheckboxExpandStepFormField>
          </>
        ) : null}
      </Flex>
    </Flex>
  )
}
