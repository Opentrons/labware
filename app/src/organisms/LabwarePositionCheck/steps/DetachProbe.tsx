import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useSelector } from 'react-redux'

import {
  LegacyStyledText,
  RESPONSIVENESS,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import {
  selectActivePipette,
  selectActivePipetteChannelCount,
} from '/app/redux/protocol-runs'

import detachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_1.webm'
import detachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_8.webm'
import detachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_96.webm'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

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

export const DetachProbe = ({
  runId,
  proceed,
  commandUtils,
}: LPCWizardContentProps): JSX.Element => {
  const { t, i18n } = useTranslation(['labware_position_check', 'shared'])
  const {
    handleProbeDetachment,
    toggleRobotMoving,
    handleValidMoveToMaintenancePosition,
  } = commandUtils
  const pipette = useSelector(selectActivePipette(runId))
  const channels = useSelector(selectActivePipetteChannelCount(runId))

  // TODO(jh, 01-30-25): This will break the flows, but currently, DetachProbe is inaccessible.
  //  This onClick behavior should be tied directly to the "exit" button.
  useEffect(() => {
    void toggleRobotMoving(true)
      .then(() => handleValidMoveToMaintenancePosition(pipette))
      .finally(() => toggleRobotMoving(false))
  }, [])

  const probeVideoSrc = ((): string => {
    switch (channels) {
      case 1:
        return detachProbe1
      case 8:
        return detachProbe8
      case 96:
        return detachProbe96
    }
  })()

  const handleProceed = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleProbeDetachment(pipette, proceed))
      .finally(() => toggleRobotMoving(false))
  }

  return (
    <GenericWizardTile
      header={i18n.format(t('detach_probe'), 'capitalize')}
      //  todo(jr, 5/30/23): update animations! these are not final for 1, 8 and 96
      rightHandBody={
        <StyledVideo autoPlay loop controls={false}>
          <source src={probeVideoSrc} />
        </StyledVideo>
      }
      bodyText={
        <StyledBody>{i18n.format(t('remove_probe'), 'capitalize')}</StyledBody>
      }
      proceedButtonText={t('confirm_detached')}
      proceed={handleProceed}
    />
  )
}
