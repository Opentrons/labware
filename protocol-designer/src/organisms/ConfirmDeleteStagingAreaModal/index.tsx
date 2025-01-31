import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  Flex,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { HandleEnter } from '../../atoms/HandleEnter'
import { getMainPagePortalEl } from '../Portal'

interface ConfirmDeleteStagingAreaModalProps {
  onClose: () => void
  onConfirm: () => void
}
export function ConfirmDeleteStagingAreaModal(
  props: ConfirmDeleteStagingAreaModalProps
): JSX.Element {
  const { onClose, onConfirm } = props
  const { t, i18n } = useTranslation(['create_new_protocol', 'shared'])

  return createPortal(
    <HandleEnter onEnter={onConfirm}>
      <Modal
        marginLeft="0"
        zIndexOverlay={11}
        title={t('staging_area_has_labware')}
        type="info"
        onClose={onClose}
        footer={
          <Flex
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
            padding={SPACING.spacing24}
          >
            <SecondaryButton
              onClick={() => {
                onClose()
              }}
            >
              {t('shared:cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={onConfirm}>
              {i18n.format(t('shared:continue'), 'capitalize')}
            </PrimaryButton>
          </Flex>
        }
      >
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('staging_area_will_delete_labware')}
        </StyledText>
      </Modal>
    </HandleEnter>,
    getMainPagePortalEl()
  )
}
