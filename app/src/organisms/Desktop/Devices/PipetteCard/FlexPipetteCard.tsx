import { useState, useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  CURSOR_POINTER,
  Banner,
  LegacyStyledText,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  NINETY_SIX_CHANNEL,
  SINGLE_MOUNT_PIPETTES,
  FLEX_ROBOT_TYPE,
  LEFT,
} from '@opentrons/shared-data'
import {
  useCurrentSubsystemUpdateQuery,
  useHost,
} from '@opentrons/react-api-client'
import { InstrumentCard } from '/app/molecules/InstrumentCard'
import { ChoosePipette } from '/app/organisms/PipetteWizardFlows/ChoosePipette'
import { FLOWS } from '/app/organisms/PipetteWizardFlows/constants'
import { handlePipetteWizardFlows } from '/app/organisms/PipetteWizardFlows'
import {
  DropTipWizardFlows,
  useDropTipWizardFlows,
} from '/app/organisms/DropTipWizardFlows'

import { AboutPipetteSlideout } from './AboutPipetteSlideout'

import type { MouseEventHandler } from 'react'
import type {
  BadPipette,
  HostConfig,
  Mount,
  PipetteData,
} from '@opentrons/api-client'
import type { PipetteModelSpecs } from '@opentrons/shared-data'
import type {
  PipetteWizardFlow,
  SelectablePipettes,
} from '/app/organisms/PipetteWizardFlows/types'

interface FlexPipetteCardProps {
  attachedPipette: PipetteData | BadPipette | null
  pipetteModelSpecs: PipetteModelSpecs | null
  mount: Mount
  isRunActive: boolean
  isEstopNotDisengaged: boolean
}
const BANNER_LINK_CSS = css`
  text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
  cursor: ${CURSOR_POINTER};
  margin-left: ${SPACING.spacing8};
`

const INSTRUMENT_CARD_STYLE = css`
  p {
    text-transform: lowercase;
  }

  p::first-letter {
    text-transform: uppercase;
  }
`

const POLL_DURATION_MS = 5000

export function FlexPipetteCard({
  pipetteModelSpecs,
  attachedPipette,
  mount,
  isRunActive,
  isEstopNotDisengaged,
}: FlexPipetteCardProps): JSX.Element {
  const { t, i18n } = useTranslation(['device_details', 'shared'])
  const host = useHost() as HostConfig

  const [
    showAboutPipetteSlideout,
    setShowAboutPipetteSlideout,
  ] = useState<boolean>(false)
  const [showChoosePipette, setShowChoosePipette] = useState(false)
  const [selectedPipette, setSelectedPipette] = useState<SelectablePipettes>(
    SINGLE_MOUNT_PIPETTES
  )
  const attachedPipetteIs96Channel =
    attachedPipette?.ok && attachedPipette.instrumentName === 'p1000_96'
  const selectedPipetteForWizard = attachedPipetteIs96Channel
    ? NINETY_SIX_CHANNEL
    : selectedPipette
  const setCloseFlow = (): void => {
    setSelectedPipette(SINGLE_MOUNT_PIPETTES)
  }

  const { showDTWiz, enableDTWiz, disableDTWiz } = useDropTipWizardFlows()

  const handleLaunchPipetteWizardFlows = (
    flowType: PipetteWizardFlow
  ): void => {
    handlePipetteWizardFlows({
      flowType,
      mount,
      closeFlow: setCloseFlow,
      selectedPipette: selectedPipetteForWizard,
      host,
    })
  }
  const handleChoosePipette: MouseEventHandler<HTMLButtonElement> = () => {
    setShowChoosePipette(true)
  }
  const handleAttach = (): void => {
    setShowChoosePipette(false)
    handleLaunchPipetteWizardFlows(FLOWS.ATTACH)
  }

  const handleDetach: MouseEventHandler<HTMLButtonElement> = () => {
    handleLaunchPipetteWizardFlows(FLOWS.DETACH)
  }

  const handleCalibrate: MouseEventHandler<HTMLButtonElement> = () => {
    handleLaunchPipetteWizardFlows(FLOWS.CALIBRATE)
  }

  const [pollForSubsystemUpdate, setPollForSubsystemUpdate] = useState(false)
  const subsystem = attachedPipette?.subsystem ?? null
  const { data: subsystemUpdateData } = useCurrentSubsystemUpdateQuery(
    subsystem,
    {
      enabled: pollForSubsystemUpdate,
      refetchInterval: POLL_DURATION_MS,
    }
  )
  const pipetteDisplayName = pipetteModelSpecs?.displayName
  // we should poll for a subsystem update from the time a bad instrument is
  // detected until the update has been done for 5 seconds
  // this gives the instruments endpoint time to start reporting
  // a good instrument
  useEffect(() => {
    if (attachedPipette?.ok === false) {
      setPollForSubsystemUpdate(true)
    } else if (
      subsystemUpdateData != null &&
      subsystemUpdateData.data.updateStatus === 'done'
    ) {
      setTimeout(() => {
        setPollForSubsystemUpdate(false)
      }, POLL_DURATION_MS)
    }
  }, [attachedPipette?.ok, subsystemUpdateData])

  const menuOverlayItems =
    attachedPipette == null || !attachedPipette.ok
      ? [
          {
            label: t('attach_pipette'),
            disabled: attachedPipette != null || isRunActive,
            onClick: handleChoosePipette,
          },
        ]
      : [
          {
            label:
              attachedPipette.data.calibratedOffset?.last_modified != null
                ? t('recalibrate_pipette')
                : t('calibrate_pipette'),
            disabled: attachedPipette == null || isRunActive,
            onClick: handleCalibrate,
          },
          {
            label: t('detach_pipette'),
            disabled: attachedPipette == null || isRunActive,
            onClick: handleDetach,
          },
          {
            label: t('about_pipette'),
            disabled: attachedPipette == null,
            onClick: () => {
              setShowAboutPipetteSlideout(true)
            },
          },
          {
            label: i18n.format(t('drop_tips'), 'capitalize'),
            disabled: attachedPipette == null || isRunActive,
            onClick: () => {
              enableDTWiz()
            },
          },
        ]
  return (
    <>
      {(attachedPipette == null || attachedPipette.ok) &&
      subsystemUpdateData == null ? (
        <InstrumentCard
          description={
            attachedPipette != null && pipetteDisplayName != null
              ? pipetteDisplayName
              : i18n.format(t('shared:empty'), 'capitalize')
          }
          instrumentDiagramProps={{
            pipetteSpecs: pipetteModelSpecs,
            mount,
          }}
          banner={
            attachedPipette?.ok &&
            attachedPipette.data.calibratedOffset?.last_modified == null ? (
              <Banner type="error" marginBottom={SPACING.spacing4} width="100%">
                {isEstopNotDisengaged ? (
                  <LegacyStyledText as="p">
                    {t('calibration_needed_without_link')}
                  </LegacyStyledText>
                ) : (
                  <Trans
                    t={t}
                    i18nKey={'calibration_needed'}
                    components={{
                      calLink: (
                        <LegacyStyledText
                          as="p"
                          css={BANNER_LINK_CSS}
                          onClick={handleCalibrate}
                        />
                      ),
                    }}
                  />
                )}
              </Banner>
            ) : null
          }
          label={
            attachedPipetteIs96Channel
              ? t('both_mounts')
              : t('mount', {
                  side: mount === LEFT ? t('left') : t('right'),
                })
          }
          menuOverlayItems={menuOverlayItems}
          isEstopNotDisengaged={isEstopNotDisengaged}
        />
      ) : null}
      {attachedPipette?.ok === false ||
      (subsystemUpdateData != null && pollForSubsystemUpdate) ? (
        <InstrumentCard
          label={i18n.format(t('mount', { side: mount }), 'capitalize')}
          css={INSTRUMENT_CARD_STYLE}
          description={t('instrument_attached')}
          banner={
            <Banner
              type={subsystemUpdateData != null ? 'warning' : 'error'}
              marginBottom={SPACING.spacing4}
            >
              <Trans
                t={t}
                i18nKey={
                  subsystemUpdateData != null
                    ? 'firmware_update_occurring'
                    : 'firmware_update_needed'
                }
              />
            </Banner>
          }
          isEstopNotDisengaged={isEstopNotDisengaged}
        />
      ) : null}
      {showDTWiz && pipetteModelSpecs != null ? (
        <DropTipWizardFlows
          robotType={FLEX_ROBOT_TYPE}
          mount={mount}
          instrumentModelSpecs={pipetteModelSpecs}
          closeFlow={disableDTWiz}
          modalStyle="simple"
        />
      ) : null}
      {attachedPipette?.ok && showAboutPipetteSlideout ? (
        <AboutPipetteSlideout
          pipetteId={attachedPipette.serialNumber}
          pipetteName={pipetteDisplayName ?? attachedPipette.instrumentName}
          firmwareVersion={attachedPipette.firmwareVersion}
          isExpanded={showAboutPipetteSlideout}
          onCloseClick={() => {
            setShowAboutPipetteSlideout(false)
          }}
        />
      ) : null}
      {showChoosePipette ? (
        <ChoosePipette
          proceed={handleAttach}
          setSelectedPipette={setSelectedPipette}
          selectedPipette={selectedPipette}
          exit={() => {
            setShowChoosePipette(false)
          }}
          mount={mount}
        />
      ) : null}
    </>
  )
}
