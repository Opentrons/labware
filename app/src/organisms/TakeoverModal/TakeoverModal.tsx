import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { getTopPortalEl } from '/app/App/portal'
import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'

import type { Dispatch, SetStateAction } from 'react'
import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

interface TakeoverModalProps {
  title: string
  showConfirmTerminateModal: boolean
  setShowConfirmTerminateModal: Dispatch<SetStateAction<boolean>>
  confirmTerminate: () => void
  terminateInProgress: boolean
}

export function TakeoverModal(props: TakeoverModalProps): JSX.Element {
  const {
    title,
    showConfirmTerminateModal,
    setShowConfirmTerminateModal,
    confirmTerminate,
    terminateInProgress,
  } = props
  const { t } = useTranslation(['shared', 'branded'])

  const terminateHeader: OddModalHeaderBaseProps = {
    title: t('terminate') + '?',
    iconName: 'ot-alert',
    iconColor: COLORS.yellow50,
  }

  return createPortal(
    showConfirmTerminateModal ? (
      //    confirm terminate modal
      <OddModal header={terminateHeader}>
        <Flex flexDirection={DIRECTION_COLUMN} width="100%">
          <LegacyStyledText as="p" marginBottom={SPACING.spacing32}>
            {t('branded:confirm_terminate')}
          </LegacyStyledText>
          <Flex flex="1" gridGap={SPACING.spacing8}>
            <SmallButton
              onClick={() => {
                setShowConfirmTerminateModal(false)
              }}
              buttonText={t('continue_activity')}
              width="50%"
            />
            <SmallButton
              iconName={terminateInProgress ? 'ot-spinner' : undefined}
              iconPlacement="startIcon"
              buttonType="alert"
              onClick={confirmTerminate}
              buttonText={t('terminate_activity')}
              width="50%"
              disabled={terminateInProgress}
            />
          </Flex>
        </Flex>
      </OddModal>
    ) : (
      <OddModal>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing40}
          alignItems={ALIGN_CENTER}
          justifyContent={ALIGN_CENTER}
          width="100%"
        >
          <Flex
            height="12.5rem"
            backgroundColor={COLORS.grey35}
            borderRadius={BORDERS.borderRadius12}
            flexDirection={DIRECTION_COLUMN}
            color={COLORS.grey60}
            padding={SPACING.spacing24}
            alignItems={ALIGN_CENTER}
            width="100%"
          >
            <Icon
              name="ot-alert"
              size="2.5rem"
              marginBottom={SPACING.spacing16}
            />
            <LegacyStyledText
              as="h4"
              marginBottom={SPACING.spacing4}
              fontWeight={TYPOGRAPHY.fontWeightBold}
            >
              {title}
            </LegacyStyledText>
            <LegacyStyledText as="p" textAlign={TYPOGRAPHY.textAlignCenter}>
              {t('branded:computer_in_app_is_controlling_robot')}
            </LegacyStyledText>
          </Flex>
          <LegacyStyledText
            as="p"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            onClick={() => {
              setShowConfirmTerminateModal(true)
            }}
          >
            {t('terminate')}
          </LegacyStyledText>
        </Flex>
      </OddModal>
    ),
    getTopPortalEl()
  )
}
