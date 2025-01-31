import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Divider,
  Flex,
  SPACING,
  StyledText,
  Tabs,
} from '@opentrons/components'
import { getTrashOrLabware } from '@opentrons/step-generation'
import { getEnableReturnTip } from '../../../../../../feature-flags/selectors'
import {
  getAdditionalEquipmentEntities,
  getLabwareEntities,
  getPipetteEntities,
} from '../../../../../../step-forms/selectors'
import {
  CheckboxExpandStepFormField,
  InputStepFormField,
} from '../../../../../../molecules'
import {
  BlowoutLocationField,
  BlowoutOffsetField,
  ChangeTipField,
  DisposalField,
  DropTipField,
  FlowRateField,
  LabwareField,
  PartialTipField,
  PathField,
  PickUpTipField,
  PipetteField,
  PositionField,
  TiprackField,
  TipWellSelectionField,
  VolumeField,
  WellSelectionField,
  WellsOrderField,
} from '../../PipetteFields'
import {
  getBlowoutLocationOptionsForForm,
  getFormErrorsMappedToField,
  getFormLevelError,
  getLabwareFieldForPositioningField,
} from '../../utils'
import type { StepFieldName } from '../../../../../../form-types'
import type { StepFormProps } from '../../types'

const makeAddFieldNamePrefix = (prefix: string) => (
  fieldName: string
): StepFieldName => `${prefix}_${fieldName}`

export function MoveLiquidTools(props: StepFormProps): JSX.Element {
  const {
    toolboxStep,
    propsForFields,
    formData,
    visibleFormErrors,
    setShowFormErrors,
    tab,
    setTab,
  } = props
  const { t, i18n } = useTranslation(['protocol_steps', 'form', 'tooltip'])
  const { path } = formData
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const enableReturnTip = useSelector(getEnableReturnTip)
  const labwares = useSelector(getLabwareEntities)
  const pipettes = useSelector(getPipetteEntities)
  const addFieldNamePrefix = makeAddFieldNamePrefix(tab)

  const isWasteChuteSelected =
    propsForFields.dispense_labware?.value != null
      ? additionalEquipmentEntities[
          String(propsForFields.dispense_labware.value)
        ]?.name === 'wasteChute'
      : false
  const isTrashBinSelected =
    propsForFields.dispense_labware?.value != null
      ? additionalEquipmentEntities[
          String(propsForFields.dispense_labware.value)
        ]?.name === 'trashBin'
      : false
  const userSelectedPickUpTipLocation =
    labwares[String(propsForFields.pickUpTip_location.value)] != null
  const userSelectedDropTipLocation =
    labwares[String(propsForFields.dropTip_location.value)] != null

  const is96Channel =
    propsForFields.pipette.value != null &&
    pipettes[String(propsForFields.pipette.value)].name === 'p1000_96'
  const isDisposalLocation =
    additionalEquipmentEntities[String(propsForFields.dispense_labware.value)]
      ?.name === 'wasteChute' ||
    additionalEquipmentEntities[String(propsForFields.dispense_labware.value)]
      ?.name === 'trashBin'

  const destinationLabwareType =
    formData.dispense_labware != null
      ? getTrashOrLabware(
          labwares,
          additionalEquipmentEntities,
          formData.dispense_labware as string
        )
      : null
  const isDestinationTrash =
    destinationLabwareType != null
      ? ['trashBin', 'wasteChute'].includes(destinationLabwareType)
      : false
  const dispenseMixDisabledTooltipText = t(
    `tooltip:step_fields.moveLiquid.disabled.${
      isDestinationTrash ? 'dispense_mix_checkbox' : 'dispense_mix_checkbox_2'
    }`
  )
  const aspirateTab = {
    text: t('aspirate'),
    isActive: tab === 'aspirate',
    onClick: () => {
      setTab('aspirate')
      setShowFormErrors?.(false)
    },
  }
  const dispenseTab = {
    text: t('dispense'),

    isActive: tab === 'dispense',
    onClick: () => {
      setTab('dispense')
      setShowFormErrors?.(false)
    },
  }
  const hideWellOrderField =
    tab === 'dispense' && (isWasteChuteSelected || isTrashBinSelected)

  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  return toolboxStep === 0 ? (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      paddingY={SPACING.spacing16}
    >
      <PipetteField {...propsForFields.pipette} />
      {is96Channel ? (
        <>
          <Divider marginY="0" />
          <PartialTipField {...propsForFields.nozzles} />
        </>
      ) : null}
      <Divider marginY="0" />
      <TiprackField
        {...propsForFields.tipRack}
        pipetteId={propsForFields.pipette.value}
      />
      <Divider marginY="0" />
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
        <LabwareField
          {...propsForFields.aspirate_labware}
          errorToShow={getFormLevelError(
            'aspirate_labware',
            mappedErrorsToField
          )}
        />
        <WellSelectionField
          {...propsForFields.aspirate_wells}
          labwareId={String(propsForFields.aspirate_labware.value)}
          pipetteId={formData.pipette}
          nozzles={String(propsForFields.nozzles.value) ?? null}
          hasFormError={
            visibleFormErrors?.some(error =>
              error.dependentFields.includes('aspirate_wells')
            ) ?? false
          }
          errorToShow={getFormLevelError('aspirate_wells', mappedErrorsToField)}
        />
      </Flex>
      <Divider marginY="0" />
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
        <LabwareField
          {...propsForFields.dispense_labware}
          errorToShow={getFormLevelError(
            'dispense_labware',
            mappedErrorsToField
          )}
        />
        {isDisposalLocation ? null : (
          <WellSelectionField
            {...propsForFields.dispense_wells}
            labwareId={String(propsForFields.dispense_labware.value)}
            pipetteId={formData.pipette}
            nozzles={String(propsForFields.nozzles.value) ?? null}
            hasFormError={
              visibleFormErrors?.some(error =>
                error.dependentFields.includes('dispense_wells')
              ) ?? false
            }
            errorToShow={getFormLevelError(
              'dispense_wells',
              mappedErrorsToField
            )}
          />
        )}
      </Flex>
      <Divider marginY="0" />
      <VolumeField
        {...propsForFields.volume}
        errorToShow={getFormLevelError('volume', mappedErrorsToField)}
      />
      <Divider marginY="0" />
      <PathField
        {...propsForFields.path}
        aspirate_airGap_checkbox={formData.aspirate_airGap_checkbox}
        aspirate_airGap_volume={formData.aspirate_airGap_volume}
        aspirate_wells={formData.aspirate_wells}
        changeTip={formData.changeTip}
        dispense_wells={formData.dispense_wells}
        pipette={formData.pipette}
        volume={formData.volume}
        tipRack={formData.tipRack}
        isDisposalLocation={isDisposalLocation}
        title={t('pipette_path')}
      />
      <Divider marginY="0" />
      <ChangeTipField
        {...propsForFields.changeTip}
        aspirateWells={formData.aspirate_wells}
        dispenseWells={formData.dispense_wells}
        path={formData.path}
        stepType={formData.stepType}
        isDisposalLocation={isDisposalLocation}
        tooltipContent={null}
      />
      {enableReturnTip ? (
        <>
          <Divider marginY="0" />
          <PickUpTipField {...propsForFields.pickUpTip_location} />
          {userSelectedPickUpTipLocation ? (
            <>
              <TipWellSelectionField
                {...propsForFields.pickUpTip_wellNames}
                nozzles={String(propsForFields.nozzles.value) ?? null}
                labwareId={propsForFields.pickUpTip_location.value}
                pipetteId={propsForFields.pipette.value}
              />
            </>
          ) : null}
        </>
      ) : null}
      <Divider marginY="0" />
      <DropTipField
        {...propsForFields.dropTip_location}
        tooltipContent={null}
      />
      {userSelectedDropTipLocation && enableReturnTip ? (
        <>
          <Divider marginY="0" />
          <TipWellSelectionField
            {...propsForFields.dropTip_wellNames}
            nozzles={String(propsForFields.nozzles.value) ?? null}
            labwareId={propsForFields.dropTip_location.value}
            pipetteId={propsForFields.pipette.value}
          />
        </>
      ) : null}
    </Flex>
  ) : (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="100%"
      paddingY={SPACING.spacing16}
      gridGap={SPACING.spacing12}
    >
      <Flex padding={`0 ${SPACING.spacing16}`}>
        <Tabs tabs={[aspirateTab, dispenseTab]} />
      </Flex>
      <Divider marginY="0" />
      <FlowRateField
        key={`${addFieldNamePrefix('flowRate')}_flowRateField`}
        {...propsForFields[addFieldNamePrefix('flowRate')]}
        pipetteId={formData.pipette}
        flowRateType={tab}
        volume={propsForFields.volume?.value ?? 0}
        tiprack={propsForFields.tipRack.value}
        showTooltip={false}
      />
      <Divider marginY="0" />
      {hideWellOrderField ? null : (
        <WellsOrderField
          prefix={tab}
          updateFirstWellOrder={
            propsForFields[addFieldNamePrefix('wellOrder_first')].updateValue
          }
          updateSecondWellOrder={
            propsForFields[addFieldNamePrefix('wellOrder_second')].updateValue
          }
          firstValue={formData[addFieldNamePrefix('wellOrder_first')]}
          secondValue={formData[addFieldNamePrefix('wellOrder_second')]}
          firstName={addFieldNamePrefix('wellOrder_first')}
          secondName={addFieldNamePrefix('wellOrder_second')}
        />
      )}
      <Divider marginY="0" />
      <PositionField
        prefix={tab}
        propsForFields={propsForFields}
        zField={`${tab}_mmFromBottom`}
        xField={`${tab}_x_position`}
        yField={`${tab}_y_position`}
        labwareId={
          formData[
            getLabwareFieldForPositioningField(
              addFieldNamePrefix('mmFromBottom')
            )
          ]
        }
      />
      <Divider marginY="0" />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        padding={`0 ${SPACING.spacing16}`}
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
            tooltipText={propsForFields.preWetTip.tooltipContent}
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
          tooltipText={
            tab === 'dispense'
              ? dispenseMixDisabledTooltipText
              : propsForFields.aspirate_mix_checkbox.tooltipContent
          }
          disabled={
            tab === 'dispense'
              ? isDestinationTrash || formData.path === 'multiDispense'
              : formData.path === 'multiAspirate'
          }
        >
          {formData[`${tab}_mix_checkbox`] === true ? (
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
                errorToShow={getFormLevelError(
                  `${tab}_mix_volume`,
                  mappedErrorsToField
                )}
              />
              <InputStepFormField
                showTooltip={false}
                padding="0"
                title={t('protocol_steps:mix_times')}
                {...propsForFields[`${tab}_mix_times`]}
                units={t('application:units.times')}
                errorToShow={getFormLevelError(
                  `${tab}_mix_times`,
                  mappedErrorsToField
                )}
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
          tooltipText={propsForFields[`${tab}_delay_checkbox`].tooltipContent}
        >
          {formData[`${tab}_delay_checkbox`] === true ? (
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
                errorToShow={getFormLevelError(
                  `${tab}_delay_seconds`,
                  mappedErrorsToField
                )}
              />
              <PositionField
                prefix={tab}
                propsForFields={propsForFields}
                zField={`${tab}_delay_mmFromBottom`}
                labwareId={
                  formData[
                    getLabwareFieldForPositioningField(
                      addFieldNamePrefix('delay_mmFromBottom')
                    )
                  ]
                }
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
            tooltipText={propsForFields.blowout_checkbox.tooltipContent}
            disabled={
              formData.path === 'multiDispense' &&
              formData.disposalVolume_checkbox
            }
          >
            {formData.blowout_checkbox === true ? (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing6}
                width="100^"
              >
                <BlowoutLocationField
                  {...propsForFields.blowout_location}
                  options={getBlowoutLocationOptionsForForm({
                    path: formData.path,
                    stepType: formData.stepType,
                  })}
                  padding="0"
                />
                <FlowRateField
                  key="blowout_flowRate"
                  {...propsForFields.blowout_flowRate}
                  pipetteId={formData.pipette}
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
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.touchTip.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_touchTip_checkbox`].value}
          isChecked={propsForFields[`${tab}_touchTip_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_touchTip_checkbox`].updateValue
          }
          tooltipText={
            propsForFields[`${tab}_touchTip_checkbox`].tooltipContent
          }
        >
          {formData[`${tab}_touchTip_checkbox`] === true ? (
            <PositionField
              prefix={tab}
              propsForFields={propsForFields}
              zField={`${tab}_touchTip_mmFromTop`}
              labwareId={
                formData[
                  getLabwareFieldForPositioningField(
                    addFieldNamePrefix('touchTip_mmFromTop')
                  )
                ]
              }
            />
          ) : null}
        </CheckboxExpandStepFormField>
        <CheckboxExpandStepFormField
          title={i18n.format(
            t('form:step_edit_form.field.airGap.label'),
            'capitalize'
          )}
          checkboxValue={propsForFields[`${tab}_airGap_checkbox`].value}
          isChecked={propsForFields[`${tab}_airGap_checkbox`].value === true}
          checkboxUpdateValue={
            propsForFields[`${tab}_airGap_checkbox`].updateValue
          }
          tooltipText={propsForFields[`${tab}_airGap_checkbox`].tooltipContent}
        >
          {formData[`${tab}_airGap_checkbox`] === true ? (
            <InputStepFormField
              showTooltip={false}
              padding="0"
              title={t('protocol_steps:air_gap_volume')}
              {...propsForFields[`${tab}_airGap_volume`]}
              units={t('application:units.microliter')}
              errorToShow={getFormLevelError(
                `${tab}_airGap_volume`,
                mappedErrorsToField
              )}
            />
          ) : null}
        </CheckboxExpandStepFormField>
        {path === 'multiDispense' && tab === 'dispense' && (
          <DisposalField
            aspirate_airGap_checkbox={formData.aspirate_airGap_checkbox}
            aspirate_airGap_volume={formData.aspirate_airGap_volume}
            path={formData.path}
            pipette={formData.pipette}
            propsForFields={propsForFields}
            stepType={formData.stepType}
            volume={formData.volume}
          />
        )}
      </Flex>
    </Flex>
  )
}
