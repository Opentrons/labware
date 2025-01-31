import { useState, useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  PrimaryButton,
  JUSTIFY_END,
  ModalHeader,
  ModalShell,
} from '@opentrons/components'

import { TextOnlyButton } from '/app/atoms/buttons'
import { useHomePipettes } from '/app/local-resources/instruments'

import type { PipetteData } from '@opentrons/api-client'
import type { IconProps } from '@opentrons/components'
import type { UseHomePipettesProps } from '/app/local-resources/instruments'
import type { TipAttachmentStatusResult } from '/app/resources/instruments'

type UseProtocolDropTipModalProps = Pick<
  UseHomePipettesProps,
  'pipetteInfo'
> & {
  areTipsAttached: TipAttachmentStatusResult['areTipsAttached']
  enableDTWiz: () => void
  currentRunId: string
  onSkipAndHome: () => void
  /* True if the most recent run is the current run */
  isRunCurrent: boolean
}

export type UseProtocolDropTipModalResult =
  | {
      showModal: true
      modalProps: ProtocolDropTipModalProps
    }
  | { showModal: false; modalProps: null }

// Wraps functionality required for rendering the related modal.
export function useProtocolDropTipModal({
  areTipsAttached,
  enableDTWiz,
  isRunCurrent,
  onSkipAndHome,
  pipetteInfo,
}: UseProtocolDropTipModalProps): UseProtocolDropTipModalResult {
  const [showModal, setShowModal] = useState(areTipsAttached)

  const { homePipettes, isHoming } = useHomePipettes({
    pipetteInfo,
    onSettled: () => {
      onSkipAndHome()
    },
  })

  // Close the modal if a different app closes the run context.
  useEffect(() => {
    if (isRunCurrent && !isHoming) {
      setShowModal(areTipsAttached)
    } else if (!isRunCurrent) {
      setShowModal(false)
    }
  }, [isRunCurrent, areTipsAttached, showModal]) // Continue to show the modal if a client dismisses the maintenance run on a different app.

  const onSkip = (): void => {
    void homePipettes()
  }

  const onBeginRemoval = (): void => {
    enableDTWiz()
    setShowModal(false)
  }

  return showModal
    ? {
        showModal: true,
        modalProps: {
          onSkip,
          onBeginRemoval,
          isDisabled: isHoming,
        },
      }
    : { showModal: false, modalProps: null }
}

interface ProtocolDropTipModalProps {
  onSkip: () => void
  onBeginRemoval: () => void
  isDisabled: boolean
  mount?: PipetteData['mount']
}

export function ProtocolDropTipModal({
  onSkip,
  onBeginRemoval,
  mount,
  isDisabled,
}: ProtocolDropTipModalProps): JSX.Element {
  const { t } = useTranslation('drop_tip_wizard')

  const buildIcon = (): IconProps => {
    return {
      name: 'information',
      color: COLORS.red50,
      size: SPACING.spacing20,
      marginRight: SPACING.spacing8,
    }
  }

  const buildHeader = (): JSX.Element => {
    return (
      <ModalHeader
        title={t('remove_any_attached_tips')}
        icon={buildIcon()}
        color={COLORS.black90}
        backgroundColor={COLORS.white}
      />
    )
  }

  return (
    <ModalShell header={buildHeader()} css={MODAL_STYLE}>
      <Flex
        padding={SPACING.spacing24}
        gridGap={SPACING.spacing24}
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <StyledText desktopStyle="bodyDefaultRegular">
          <Trans
            t={t}
            i18nKey="liquid_damages_this_pipette"
            values={{
              mount,
            }}
            components={{
              mount: <strong />,
            }}
          />
        </StyledText>
        <Flex gridGap={SPACING.spacing24} justifyContent={JUSTIFY_END}>
          <TextOnlyButton
            onClick={onSkip}
            buttonText={t('skip_and_home_pipette')}
            disabled={isDisabled}
          />
          <PrimaryButton onClick={onBeginRemoval} disabled={isDisabled}>
            {t('begin_removal')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </ModalShell>
  )
}

const MODAL_STYLE = css`
  width: 500px;
`
