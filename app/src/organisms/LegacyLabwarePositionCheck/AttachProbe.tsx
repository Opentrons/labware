import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { getPipetteNameSpecs } from '@opentrons/shared-data'
import { css } from 'styled-components'
import { ProbeNotAttached } from '/app/organisms/PipetteWizardFlows/ProbeNotAttached'
import { RobotMotionLoader } from './RobotMotionLoader'
import attachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
import attachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_8.webm'
import attachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_96.webm'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'

import type { Dispatch } from 'react'
import type {
  CompletedProtocolAnalysis,
  CreateCommand,
} from '@opentrons/shared-data'
import type { LabwareOffset } from '@opentrons/api-client'
import type { Jog } from '/app/molecules/JogControls/types'
import type { useChainRunCommands } from '/app/resources/runs'
import type {
  AttachProbeStep,
  RegisterPositionAction,
  WorkingOffset,
} from './types'

interface AttachProbeProps extends AttachProbeStep {
  protocolData: CompletedProtocolAnalysis
  proceed: () => void
  registerPosition: Dispatch<RegisterPositionAction>
  chainRunCommands: ReturnType<typeof useChainRunCommands>['chainRunCommands']
  setFatalError: (errorMessage: string) => void
  workingOffsets: WorkingOffset[]
  existingOffsets: LabwareOffset[]
  handleJog: Jog
  isRobotMoving: boolean
  isOnDevice: boolean
}

export const AttachProbe = (props: AttachProbeProps): JSX.Element | null => {
  const { t, i18n } = useTranslation(['labware_position_check', 'shared'])
  const {
    pipetteId,
    protocolData,
    proceed,
    chainRunCommands,
    isRobotMoving,
    setFatalError,
    isOnDevice,
  } = props
  const [showUnableToDetect, setShowUnableToDetect] = useState<boolean>(false)

  const pipette = protocolData.pipettes.find(p => p.id === pipetteId)
  const pipetteName = pipette?.pipetteName
  const pipetteChannels =
    pipetteName != null ? getPipetteNameSpecs(pipetteName)?.channels ?? 1 : 1
  let probeVideoSrc = attachProbe1
  let probeLocation = ''
  if (pipetteChannels === 8) {
    probeLocation = t('backmost')
    probeVideoSrc = attachProbe8
  } else if (pipetteChannels === 96) {
    probeLocation = t('ninety_six_probe_location')
    probeVideoSrc = attachProbe96
  }

  const pipetteMount = pipette?.mount

  useEffect(() => {
    // move into correct position for probe attach on mount
    chainRunCommands(
      [
        {
          commandType: 'calibration/moveToMaintenancePosition' as const,
          params: {
            mount: pipetteMount ?? 'left',
          },
        },
      ],
      false
    ).catch(error => {
      setFatalError(error.message as string)
    })
  }, [])

  if (pipetteName == null || pipetteMount == null) return null

  const pipetteZMotorAxis: 'leftZ' | 'rightZ' =
    pipetteMount === 'left' ? 'leftZ' : 'rightZ'

  const handleProbeAttached = (): void => {
    const verifyCommands: CreateCommand[] = [
      {
        commandType: 'verifyTipPresence',
        params: {
          pipetteId,
          expectedState: 'present',
          followSingularSensor: 'primary',
        },
      },
    ]
    const homeCommands: CreateCommand[] = [
      { commandType: 'home', params: { axes: [pipetteZMotorAxis] } },
      {
        commandType: 'retractAxis' as const,
        params: {
          axis: pipetteZMotorAxis,
        },
      },
      {
        commandType: 'retractAxis' as const,
        params: { axis: 'x' },
      },
      {
        commandType: 'retractAxis' as const,
        params: { axis: 'y' },
      },
    ]
    chainRunCommands(verifyCommands, false)
      .then(() => {
        chainRunCommands(homeCommands, false)
          .then(() => {
            proceed()
          })
          .catch((e: Error) => {
            setFatalError(
              `AttachProbe failed to move to safe location after probe attach with message: ${e.message}`
            )
          })
      })
      .catch((e: Error) => {
        setShowUnableToDetect(true)
      })
  }

  if (isRobotMoving)
    return (
      <RobotMotionLoader header={t('shared:stand_back_robot_is_in_motion')} />
    )
  else if (showUnableToDetect)
    return (
      <ProbeNotAttached
        handleOnClick={handleProbeAttached}
        setShowUnableToDetect={setShowUnableToDetect}
        isOnDevice={isOnDevice}
      />
    )

  return (
    <GenericWizardTile
      header={i18n.format(t('attach_probe'), 'capitalize')}
      rightHandBody={
        <video
          css={css`
            padding-top: ${SPACING.spacing4};
            width: 100%;
            min-height: 18rem;
          `}
          autoPlay={true}
          loop={true}
          controls={false}
        >
          <source src={probeVideoSrc} />
        </video>
      }
      bodyText={
        <LegacyStyledText css={BODY_STYLE}>
          <Trans
            t={t}
            i18nKey={'install_probe'}
            values={{ location: probeLocation }}
            components={{
              bold: <strong />,
            }}
          />
        </LegacyStyledText>
      }
      proceedButtonText={i18n.format(t('shared:continue'), 'capitalize')}
      proceed={handleProbeAttached}
    />
  )
}

export const BODY_STYLE = css`
  ${TYPOGRAPHY.pRegular};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 1.275rem;
    line-height: 1.75rem;
  }
`
