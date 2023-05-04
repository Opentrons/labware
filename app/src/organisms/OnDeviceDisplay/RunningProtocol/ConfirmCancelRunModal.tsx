import { SmallButton } from '../../../atoms/buttons/OnDeviceDisplay'
import { StyledText } from '../../../atoms/text'
import { Modal } from '../../../molecules/Modal/OnDeviceDisplay/Modal'
import type { ModalHeaderBaseProps } from '../../../molecules/Modal/OnDeviceDisplay/types'
import { useTrackProtocolRunEvent } from '../../../organisms/Devices/hooks'
import {
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  TYPOGRAPHY,
  SPACING,
} from '@opentrons/components'
import { useStopRunMutation } from '@opentrons/react-api-client'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'

interface ConfirmCancelRunModalProps {
  runId: string
  setShowConfirmCancelRunModal: (showConfirmCancelRunModal: boolean) => void
  isActiveRun: boolean
}

export function ConfirmCancelRunModal({
  runId,
  setShowConfirmCancelRunModal,
  isActiveRun,
}: ConfirmCancelRunModalProps): JSX.Element {
  const { t } = useTranslation(['run_details', 'shared'])
  const { stopRun } = useStopRunMutation()
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId)
  const history = useHistory()
  const [isCanceling, setIsCanceling] = React.useState(false)

  const modalHeader: ModalHeaderBaseProps = {
    title: t('cancel_run_modal_heading'),
    hasExitIcon: false,
    iconName: 'ot-alert',
    iconColor: COLORS.yellow_two,
  }

  const handleCancelRun = (): void => {
    stopRun(runId, {
      onSuccess: () => {
        trackProtocolRunEvent({ name: 'runCancel' })
        history.push('/dashboard')
      },
      onError: () => {
        setIsCanceling(false)
      },
    })
  }

  return (
    <Modal
      modalSize="medium"
      header={modalHeader}
      isError={isActiveRun}
      onOutsideClick={() => setShowConfirmCancelRunModal(false)}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          padding={SPACING.spacing32}
          gridGap="0.75rem"
        >
          <StyledText
            fontSize={TYPOGRAPHY.fontSize22}
            lineHeight={TYPOGRAPHY.lineHeight28}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
          >
            {t('cancel_run_alert_info')}
          </StyledText>
          <StyledText
            fontSize={TYPOGRAPHY.fontSize22}
            lineHeight={TYPOGRAPHY.lineHeight28}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
          >
            {t('cancel_run_module_info')}
          </StyledText>
        </Flex>
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing8}
          width="100%"
        >
          <SmallButton
            flex="1"
            buttonType="primary"
            buttonText={t('shared:go_back')}
            onClick={() => setShowConfirmCancelRunModal(false)}
          />
          <SmallButton
            flex="1"
            buttonType="alert"
            buttonText={t('cancel_run')}
            onClick={handleCancelRun}
            disabled={isCanceling}
          />
        </Flex>
      </Flex>
    </Modal>
  )
}
