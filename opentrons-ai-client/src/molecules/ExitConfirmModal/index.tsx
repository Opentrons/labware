import {
  AlertPrimaryButton,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_FLEX_END,
  Modal,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { useAtom } from 'jotai'
import { displayExitConfirmModalAtom } from '../../resources/atoms'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ExitConfirmModal(): JSX.Element {
  const [
    displayExitConfirmModalState,
    setDisplayExitConfirmModalState,
  ] = useAtom(displayExitConfirmModalAtom)
  const navigate = useNavigate()
  const { t } = useTranslation('protocol_generator')

  if (!displayExitConfirmModalState) {
    return <></>
  }

  function handleContinueClick(): void {
    setDisplayExitConfirmModalState(false)
  }

  function handleExitClick(): void {
    setDisplayExitConfirmModalState(false)
    navigate('/')
  }

  return (
    <Modal type="info" title={t('exit_confirmation_title')} marginLeft="0">
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText
          paddingTop={`${SPACING.spacing8}`}
          paddingBottom={`${SPACING.spacing24}`}
        >
          {t('exit_confirmation_body')}
        </StyledText>
        <Flex justifyContent={JUSTIFY_FLEX_END} gap={SPACING.spacing8}>
          <SecondaryButton onClick={handleContinueClick}>
            {t('exit_confirmation_cancel')}
          </SecondaryButton>
          <AlertPrimaryButton onClick={handleExitClick}>
            {t('exit_confirmation_exit')}
          </AlertPrimaryButton>
        </Flex>
      </Flex>
    </Modal>
  )
}
