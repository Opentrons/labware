import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

import { RUN_STATUS_STOPPED } from '@opentrons/api-client'
import {
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import {
  useStopRunMutation,
  useDeleteRunMutation,
  useDismissCurrentRunMutation,
} from '@opentrons/react-api-client'

import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'
import { useTrackProtocolRunEvent } from '/app/redux-resources/analytics'
import { useRunStatus } from '/app/resources/runs'
import { ANALYTICS_PROTOCOL_RUN_ACTION } from '/app/redux/analytics'
import { getLocalRobot } from '/app/redux/discovery'
import { CancelingRunModal } from './CancelingRunModal'

import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

interface ConfirmCancelRunModalProps {
  runId: string
  setShowConfirmCancelRunModal: (showConfirmCancelRunModal: boolean) => void
  isActiveRun: boolean
  isQuickTransfer: boolean
  protocolId?: string | null
}

export function ConfirmCancelRunModal({
  runId,
  setShowConfirmCancelRunModal,
  isActiveRun,
  isQuickTransfer,
  protocolId,
}: ConfirmCancelRunModalProps): JSX.Element {
  const { t } = useTranslation(['run_details', 'shared'])
  const { stopRun } = useStopRunMutation()
  const { deleteRun } = useDeleteRunMutation({
    onError: error => {
      setIsCanceling(false)
      console.error('Error deleting quick transfer run', error)
    },
  })
  const {
    dismissCurrentRun,
    isLoading: isDismissing,
  } = useDismissCurrentRunMutation({
    onSettled: () => {
      if (isQuickTransfer) {
        deleteRun(runId)
      }
    },
  })
  const runStatus = useRunStatus(runId)
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name ?? ''
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId, robotName)
  const navigate = useNavigate()
  const [isCanceling, setIsCanceling] = useState(false)

  const modalHeader: OddModalHeaderBaseProps = {
    title: t('cancel_run_modal_heading'),
    hasExitIcon: false,
    iconName: 'ot-alert',
    iconColor: COLORS.yellow50,
  }

  const handleCancelRun = (): void => {
    setIsCanceling(true)
    stopRun(runId, {
      onError: () => {
        setIsCanceling(false)
      },
    })
  }

  useEffect(() => {
    if (runStatus === RUN_STATUS_STOPPED) {
      trackProtocolRunEvent({ name: ANALYTICS_PROTOCOL_RUN_ACTION.CANCEL })
      if (!isActiveRun) {
        dismissCurrentRun(runId)
        if (isQuickTransfer && protocolId != null) {
          navigate(`/quick-transfer/${protocolId}`)
        } else if (isQuickTransfer) {
          navigate('/quick-transfer')
        } else if (protocolId != null) {
          navigate(`/protocols/${protocolId}`)
        } else {
          navigate('/protocols')
        }
      }
    }
  }, [runStatus])

  return isCanceling || isDismissing ? (
    <CancelingRunModal />
  ) : (
    <OddModal
      modalSize="medium"
      header={modalHeader}
      onOutsideClick={() => {
        setShowConfirmCancelRunModal(false)
      }}
    >
      <Flex flexDirection={DIRECTION_COLUMN} width="100%">
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing12}
          paddingBottom={SPACING.spacing32}
          paddingTop={`${isActiveRun ? SPACING.spacing32 : '0'}`}
        >
          <LegacyStyledText as="p">
            {t('cancel_run_alert_info_flex')}
          </LegacyStyledText>
          <LegacyStyledText as="p">
            {t('cancel_run_module_info')}
          </LegacyStyledText>
        </Flex>
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap={SPACING.spacing8}
          width="100%"
        >
          <SmallButton
            flex="1"
            buttonText={t('shared:go_back')}
            onClick={() => {
              setShowConfirmCancelRunModal(false)
            }}
          />
          <SmallButton
            flex="1"
            buttonType="alert"
            buttonText={t('cancel_run')}
            onClick={handleCancelRun}
          />
        </Flex>
      </Flex>
    </OddModal>
  )
}
