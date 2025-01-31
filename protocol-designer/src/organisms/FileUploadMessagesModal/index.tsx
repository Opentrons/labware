import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SPACING,
  SecondaryButton,
} from '@opentrons/components'
import { getFileUploadMessages } from '../../load-file/selectors'
import { dismissFileUploadMessage, undoLoadFile } from '../../load-file/actions'
import { useFileUploadModalContents } from './utils'

export function FileUploadMessagesModal(): JSX.Element | null {
  const message = useSelector(getFileUploadMessages)
  const dispatch = useDispatch()
  const { t } = useTranslation('shared')
  const modalContents = useFileUploadModalContents({
    uploadResponse: message,
  })
  const dismissModal = (): void => {
    dispatch(dismissFileUploadMessage())
  }

  if (modalContents == null) return null

  const { title, body } = modalContents
  const showButtons =
    title !== t('invalid_json_file') && title !== t('incorrect_file_header')

  return (
    <Modal
      marginLeft="0"
      type={message?.isError ? 'error' : 'info'}
      title={title}
      closeOnOutsideClick
      onClose={dismissModal}
      footer={
        showButtons && (
          <Flex
            padding={SPACING.spacing24}
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
          >
            <SecondaryButton
              onClick={() => {
                dispatch(undoLoadFile())
              }}
            >
              {t('cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={dismissModal}>{t('confirm')}</PrimaryButton>
          </Flex>
        )
      }
    >
      {body}
    </Modal>
  )
}
