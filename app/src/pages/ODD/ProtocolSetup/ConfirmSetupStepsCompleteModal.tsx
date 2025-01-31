import { useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'

import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'

import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

interface ConfirmSetupStepsCompleteModalProps {
  onCloseClick: () => void
  onConfirmClick: () => void
  missingSteps: string[]
}

export function ConfirmSetupStepsCompleteModal({
  onCloseClick,
  missingSteps,
  onConfirmClick,
}: ConfirmSetupStepsCompleteModalProps): JSX.Element {
  const { i18n, t } = useTranslation(['protocol_setup', 'shared'])
  const modalHeader: OddModalHeaderBaseProps = {
    title: t('are_you_sure_you_want_to_proceed'),
    hasExitIcon: true,
  }

  const handleStartRun = (): void => {
    onConfirmClick()
    onCloseClick()
  }

  return (
    <OddModal header={modalHeader} onOutsideClick={onCloseClick}>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing32}
        width="100%"
      >
        <LegacyStyledText as="p">
          {t('you_havent_confirmed', {
            missingSteps: new Intl.ListFormat('en', {
              style: 'short',
              type: 'conjunction',
            }).format(missingSteps),
          })}
        </LegacyStyledText>
        <Flex gridGap={SPACING.spacing8}>
          <SmallButton
            flex="1"
            buttonType="secondary"
            buttonText={i18n.format(t('shared:go_back'), 'capitalize')}
            onClick={() => {
              onCloseClick()
            }}
          />
          <SmallButton
            flex="1"
            buttonType="primary"
            buttonText={t('start_run')}
            onClick={handleStartRun}
          />
        </Flex>
      </Flex>
    </OddModal>
  )
}
