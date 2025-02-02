import { Trans, useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useSelector } from 'react-redux'

import {
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { ProbeNotAttached } from '/app/organisms/PipetteWizardFlows/ProbeNotAttached'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import {
  selectActivePipette,
  selectActivePipetteChannelCount,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'

import attachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
import attachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_8.webm'
import attachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_96.webm'

import type { AttachProbeStep, LPCStepProps } from '../types'
import type { State } from '/app/redux/types'
import type { LPCWizardState } from '/app/redux/protocol-runs'

const StyledVideo = styled.video`
  padding-top: ${SPACING.spacing4};
  width: 100%;
  min-height: 18rem;
`

const StyledBody = styled(LegacyStyledText)`
  ${TYPOGRAPHY.pRegular};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 1.275rem;
    line-height: 1.75rem;
  }
`

export function AttachProbe({
  runId,
  proceed,
  commandUtils,
  step,
}: LPCStepProps<AttachProbeStep>): JSX.Element {
  const { t, i18n } = useTranslation(['labware_position_check', 'shared'])
  const isOnDevice = useSelector(getIsOnDevice)
  const { steps } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const { pipetteId } = step
  const {
    createProbeAttachmentHandler,
    handleCheckItemsPrepModules,
    toggleRobotMoving,
    setShowUnableToDetect,
    unableToDetect,
  } = commandUtils
  const pipette = useSelector((state: State) =>
    selectActivePipette(step, runId, state)
  )
  const channels = useSelector((state: State) =>
    selectActivePipetteChannelCount(step, runId, state)
  )

  const handleProbeAttached = createProbeAttachmentHandler(
    pipetteId,
    pipette,
    proceed
  )

  const { probeLocation, probeVideoSrc } = ((): {
    probeLocation: string
    probeVideoSrc: string
  } => {
    switch (channels) {
      case 1:
        return { probeLocation: '', probeVideoSrc: attachProbe1 }
      case 8:
        return { probeLocation: t('backmost'), probeVideoSrc: attachProbe8 }
      case 96:
        return {
          probeLocation: t('ninety_six_probe_location'),
          probeVideoSrc: attachProbe96,
        }
    }
  })()

  const handleProbeCheck = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleProbeAttached())
      .finally(() => toggleRobotMoving(false))
  }

  const handleProceed = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleProbeAttached())
      .then(() => handleCheckItemsPrepModules(steps.next))
      .finally(() => toggleRobotMoving(false))
  }

  if (unableToDetect) {
    return (
      <ProbeNotAttached
        handleOnClick={handleProbeCheck}
        setShowUnableToDetect={setShowUnableToDetect}
        isOnDevice={isOnDevice}
      />
    )
  } else {
    return (
      <GenericWizardTile
        header={i18n.format(t('attach_probe'), 'capitalize')}
        rightHandBody={
          <StyledVideo autoPlay loop controls={false}>
            <source src={probeVideoSrc} />
          </StyledVideo>
        }
        bodyText={
          <StyledBody>
            <Trans
              t={t}
              i18nKey={'install_probe'}
              values={{ location: probeLocation }}
              components={{
                bold: <strong />,
              }}
            />
          </StyledBody>
        }
        proceedButtonText={i18n.format(t('shared:continue'), 'capitalize')}
        proceed={handleProceed}
      />
    )
  }
}
