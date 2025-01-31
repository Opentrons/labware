import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  SINGLE_MOUNT_PIPETTES,
  NINETY_SIX_CHANNEL,
} from '@opentrons/shared-data'
import { PipetteWizardFlows } from '/app/organisms/PipetteWizardFlows'
import { GripperWizardFlows } from '/app/organisms/GripperWizardFlows'
import { MediumButton } from '/app/atoms/buttons'
import { FLOWS } from '/app/organisms/PipetteWizardFlows/constants'
import { GRIPPER_FLOW_TYPES } from '/app/organisms/GripperWizardFlows/constants'
import { formatTimeWithUtcLabel } from '/app/resources/runs'

import type { ComponentProps, MouseEventHandler } from 'react'
import type { InstrumentData } from '@opentrons/api-client'
import type { PipetteMount } from '@opentrons/shared-data'
import type { StyleProps } from '@opentrons/components'
interface InstrumentInfoProps {
  // NOTE: instrument will only be null while
  // in the middle of detach wizard which occludes
  // the main empty contents of this page
  instrument: InstrumentData | null
}
export const InstrumentInfo = (props: InstrumentInfoProps): JSX.Element => {
  const { t, i18n } = useTranslation('instruments_dashboard')
  const { instrument } = props
  const navigate = useNavigate()
  const [wizardProps, setWizardProps] = useState<
    | ComponentProps<typeof GripperWizardFlows>
    | ComponentProps<typeof PipetteWizardFlows>
    | null
  >(null)

  const sharedGripperWizardProps: Pick<
    ComponentProps<typeof GripperWizardFlows>,
    'attachedGripper' | 'closeFlow'
  > = {
    attachedGripper: instrument,
    closeFlow: () => {
      setWizardProps(null)
    },
  }

  const is96Channel =
    instrument != null &&
    instrument.ok &&
    instrument.mount !== 'extension' &&
    instrument.data?.channels === 96

  const handleDetach: MouseEventHandler = () => {
    if (instrument != null && instrument.ok) {
      setWizardProps(
        instrument.mount === 'extension'
          ? {
              ...sharedGripperWizardProps,
              flowType: GRIPPER_FLOW_TYPES.DETACH,
              onComplete: () => {
                navigate(-1)
              },
            }
          : {
              closeFlow: () => {
                setWizardProps(null)
              },
              onComplete: () => {
                navigate(-1)
              },
              mount: instrument.mount as PipetteMount,
              selectedPipette: is96Channel
                ? NINETY_SIX_CHANNEL
                : SINGLE_MOUNT_PIPETTES,
              flowType: FLOWS.DETACH,
            }
      )
    }
  }
  const handleRecalibrate: MouseEventHandler = () => {
    if (instrument != null && instrument.ok) {
      setWizardProps(
        instrument.mount === 'extension'
          ? {
              ...sharedGripperWizardProps,
              flowType: GRIPPER_FLOW_TYPES.RECALIBRATE,
            }
          : {
              closeFlow: () => {
                setWizardProps(null)
              },
              mount: instrument.mount as PipetteMount,
              selectedPipette: is96Channel
                ? NINETY_SIX_CHANNEL
                : SINGLE_MOUNT_PIPETTES,
              flowType: FLOWS.CALIBRATE,
            }
      )
    }
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      height="100%"
    >
      {instrument != null && instrument.ok ? (
        <>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            marginTop={SPACING.spacing24}
          >
            <InfoItem
              label={t('last_calibrated')}
              value={
                instrument.data.calibratedOffset?.last_modified != null
                  ? formatTimeWithUtcLabel(
                      instrument.data.calibratedOffset?.last_modified
                    )
                  : i18n.format(t('no_cal_data'), 'capitalize')
              }
            />
            {instrument.firmwareVersion != null && (
              <InfoItem
                label={t('firmware_version')}
                value={instrument.firmwareVersion}
              />
            )}
            <InfoItem
              label={t('serial_number')}
              value={instrument.serialNumber}
            />
          </Flex>
          <Flex gridGap={SPACING.spacing8}>
            <MediumButton
              buttonType="secondary"
              flex="1"
              onClick={handleDetach}
              buttonText={t('detach')}
              textTransform={TYPOGRAPHY.textTransformCapitalize}
              justifyContent={JUSTIFY_CENTER}
            />
            {instrument.mount === 'extension' ||
            instrument.data.calibratedOffset?.last_modified == null ? (
              <MediumButton
                flex="1"
                onClick={handleRecalibrate}
                buttonText={
                  instrument.data.calibratedOffset?.last_modified == null
                    ? t('calibrate')
                    : t('recalibrate')
                }
                textTransform={TYPOGRAPHY.textTransformCapitalize}
                justifyContent={JUSTIFY_CENTER}
              />
            ) : null}
          </Flex>
        </>
      ) : null}
      {wizardProps != null && 'mount' in wizardProps ? (
        <PipetteWizardFlows {...wizardProps} />
      ) : null}
      {wizardProps != null && !('mount' in wizardProps) ? (
        <GripperWizardFlows {...wizardProps} />
      ) : null}
    </Flex>
  )
}

interface InfoItemProps extends StyleProps {
  label: string
  value: string
}
function InfoItem(props: InfoItemProps): JSX.Element {
  return (
    <Flex
      borderRadius={BORDERS.borderRadius12}
      backgroundColor={COLORS.grey35}
      padding={`${SPACING.spacing16} ${SPACING.spacing24}`}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      lineHeight={TYPOGRAPHY.lineHeight36}
      {...props}
    >
      <LegacyStyledText
        as="h4"
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
        fontSize={TYPOGRAPHY.fontSize28}
        textTransform={TYPOGRAPHY.textTransformCapitalize}
      >
        {props.label}
      </LegacyStyledText>
      <LegacyStyledText
        as="h4"
        color={COLORS.grey60}
        fontSize={TYPOGRAPHY.fontSize28}
        fontWeight={TYPOGRAPHY.fontWeightRegular}
      >
        {props.value}
      </LegacyStyledText>
    </Flex>
  )
}
