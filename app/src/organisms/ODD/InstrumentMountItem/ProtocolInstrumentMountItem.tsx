import { useState, useMemo } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_FLEX_START,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
} from '@opentrons/shared-data'

import { SmallButton } from '/app/atoms/buttons'
import {
  useGripperDisplayName,
  usePipetteNameSpecs,
} from '/app/local-resources/instruments'
import { FLOWS } from '/app/organisms/PipetteWizardFlows/constants'
import { PipetteWizardFlows } from '/app/organisms/PipetteWizardFlows'
import { GripperWizardFlows } from '/app/organisms/GripperWizardFlows'

import type { MouseEventHandler } from 'react'
import type { InstrumentData } from '@opentrons/api-client'
import type {
  GripperModel,
  PipetteName,
  LoadedPipette,
} from '@opentrons/shared-data'
import type { Mount } from '/app/redux/pipettes/types'

export const MountItem = styled.div<{ isReady: boolean }>`
  display: flex;
  width: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_FLEX_START};
  padding: ${SPACING.spacing16} ${SPACING.spacing24};
  border-radius: ${BORDERS.borderRadius8};
  background-color: ${({ isReady }) =>
    isReady ? COLORS.green35 : COLORS.yellow35};
  &:active {
    background-color: ${({ isReady }) =>
      isReady ? COLORS.green40 : COLORS.yellow40};
  }
`
interface ProtocolInstrumentMountItemProps {
  mount: Mount | 'extension'
  attachedInstrument: InstrumentData | null
  speccedName: PipetteName | GripperModel
  instrumentsRefetch?: () => void
  pipetteInfo?: LoadedPipette[]
}
export function ProtocolInstrumentMountItem(
  props: ProtocolInstrumentMountItemProps
): JSX.Element {
  const { i18n, t } = useTranslation('protocol_setup')
  const { mount, attachedInstrument, speccedName } = props
  const [showPipetteWizardFlow, setShowPipetteWizardFlow] = useState<boolean>(
    false
  )
  const [showGripperWizardFlow, setShowGripperWizardFlow] = useState<boolean>(
    false
  )
  const memoizedAttachedGripper = useMemo(
    () =>
      attachedInstrument?.instrumentType === 'gripper' && attachedInstrument.ok
        ? attachedInstrument
        : null,
    []
  )
  const [flowType, setFlowType] = useState<string>(FLOWS.ATTACH)
  const selectedPipette =
    speccedName === 'p1000_96' ? NINETY_SIX_CHANNEL : SINGLE_MOUNT_PIPETTES

  const handleCalibrate: MouseEventHandler = () => {
    setFlowType(FLOWS.CALIBRATE)
    if (mount === 'extension') {
      setShowGripperWizardFlow(true)
    } else {
      setShowPipetteWizardFlow(true)
    }
  }
  const handleAttach: MouseEventHandler = () => {
    setFlowType(FLOWS.ATTACH)
    if (mount === 'extension') {
      setShowGripperWizardFlow(true)
    } else {
      setShowPipetteWizardFlow(true)
    }
  }
  const is96ChannelPipette = speccedName === 'p1000_96'
  const isAttachedWithCal =
    attachedInstrument != null &&
    attachedInstrument.ok &&
    attachedInstrument?.data?.calibratedOffset?.last_modified != null

  const gripperDisplayName = useGripperDisplayName(speccedName as GripperModel)
  const pipetteDisplayName = usePipetteNameSpecs(speccedName as PipetteName)
    ?.displayName

  return (
    <>
      <MountItem isReady={isAttachedWithCal}>
        <Flex
          width="100%"
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing24}
        >
          <Flex
            flex="2"
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing4}
          >
            <MountLabel>
              {i18n.format(
                is96ChannelPipette ? t('96_mount') : t('mount', { mount }),
                'titleCase'
              )}
            </MountLabel>
            <SpeccedInstrumentName>
              {mount === 'extension' ? gripperDisplayName : pipetteDisplayName}
            </SpeccedInstrumentName>
          </Flex>

          <Flex
            flex="1"
            alignItems={ALIGN_CENTER}
            gridGap={SPACING.spacing8}
            justifyContent={JUSTIFY_FLEX_START}
          >
            <Icon
              size="1.5rem"
              name={isAttachedWithCal ? 'ot-check' : 'ot-alert'}
              color={isAttachedWithCal ? COLORS.green60 : COLORS.yellow60}
            />
            <CalibrationStatus
              color={isAttachedWithCal ? COLORS.green60 : COLORS.yellow60}
            >
              {i18n.format(
                t(isAttachedWithCal ? 'calibrated' : 'no_data'),
                'capitalize'
              )}
            </CalibrationStatus>
          </Flex>
          {!isAttachedWithCal && (
            <Flex flex="1">
              <SmallButton
                onClick={
                  attachedInstrument != null ? handleCalibrate : handleAttach
                }
                buttonText={i18n.format(
                  t(attachedInstrument != null ? 'calibrate' : 'attach'),
                  'capitalize'
                )}
                buttonCategory="rounded"
              />
            </Flex>
          )}
          {isAttachedWithCal && (
            <Flex flex="1">
              <SmallButton
                onClick={handleCalibrate}
                buttonText={i18n.format(t('recalibrate'), 'capitalize')}
                buttonCategory="rounded"
              />
            </Flex>
          )}
        </Flex>
      </MountItem>
      {showPipetteWizardFlow ? (
        <PipetteWizardFlows
          flowType={flowType}
          closeFlow={() => {
            setShowPipetteWizardFlow(false)
          }}
          selectedPipette={selectedPipette}
          mount={mount as Mount}
          pipetteInfo={props.pipetteInfo}
          onComplete={props.instrumentsRefetch}
        />
      ) : null}
      {showGripperWizardFlow ? (
        <GripperWizardFlows
          attachedGripper={memoizedAttachedGripper}
          flowType={memoizedAttachedGripper != null ? 'RECALIBRATE' : 'ATTACH'}
          closeFlow={() => {
            setShowGripperWizardFlow(false)
          }}
          onComplete={props.instrumentsRefetch}
        />
      ) : null}
    </>
  )
}

const MountLabel = styled.p`
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: ${TYPOGRAPHY.fontSize22};
  line-height: ${TYPOGRAPHY.lineHeight28};
`

const SpeccedInstrumentName = styled.p`
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: ${TYPOGRAPHY.fontSize22};
  line-height: ${TYPOGRAPHY.lineHeight28};
`

const CalibrationStatus = styled.p`
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: ${TYPOGRAPHY.fontSize22};
  line-height: ${TYPOGRAPHY.lineHeight28};
  color: ${({ color }) => color};
`
