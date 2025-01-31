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
import { getLabwareUploadMessage } from '../../labware-defs/selectors'
import {
  dismissLabwareUploadMessage,
  replaceCustomLabwareDef,
} from '../../labware-defs/actions'
import { LabwareUploadModalBody } from './LabwareUploadModalBody'

export function LabwareUploadModal(): JSX.Element | null {
  const message = useSelector(getLabwareUploadMessage)
  const dispatch = useDispatch()
  const { t } = useTranslation('shared')
  const dismissModal = (): void => {
    dispatch(dismissLabwareUploadMessage())
  }
  const overwriteLabwareDef = (): void => {
    if (message && message.messageType === 'ASK_FOR_LABWARE_OVERWRITE') {
      dispatch(
        replaceCustomLabwareDef({
          defURIToOverwrite: message.defURIToOverwrite,
          newDef: message.newDef,
          isOverwriteMismatched: message.isOverwriteMismatched,
        })
      )
    } else {
      console.assert(
        false,
        `labware def should only be overwritten when messageType is ASK_FOR_LABWARE_OVERWRITE. Got ${message?.messageType}`
      )
    }
  }

  if (message == null) return null

  return (
    <Modal
      marginLeft="0"
      type={
        message.messageType === 'ASK_FOR_LABWARE_OVERWRITE'
          ? 'warning'
          : 'error'
      }
      title={t(`${message.messageType.toLowerCase()}`)}
      closeOnOutsideClick
      onClose={dismissModal}
      footer={
        message.messageType === 'ASK_FOR_LABWARE_OVERWRITE' && (
          <Flex
            padding={SPACING.spacing24}
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
          >
            <SecondaryButton onClick={dismissModal}>
              {t('cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={overwriteLabwareDef}>
              {t('overwrite_labware')}
            </PrimaryButton>
          </Flex>
        )
      }
    >
      <LabwareUploadModalBody message={message} />
    </Modal>
  )
}
