import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  ALIGN_CENTER,
  CheckboxField,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_FLEX_END,
  Link,
  PrimaryButton,
  Modal,
  SPACING,
  LegacyStyledText,
  TEXT_ALIGN_CENTER,
  TYPOGRAPHY,
} from '@opentrons/components'
import { updateConfigValue } from '/app/redux/config'

import type { ChangeEvent } from 'react'
import type { Dispatch } from '/app/redux/types'
import type { UpdateConfigValueAction } from '/app/redux/config/types'

export function setHeaterShakerAttached(
  heaterShakerAttached: boolean
): UpdateConfigValueAction {
  return updateConfigValue(
    'modules.heaterShaker.isAttached',
    heaterShakerAttached
  )
}
export interface ConfirmAttachmentModalProps {
  onCloseClick: () => void
  isProceedToRunModal: boolean
  onConfirmClick: () => void
}
export const ConfirmAttachmentModal = (
  props: ConfirmAttachmentModalProps
): JSX.Element | null => {
  const { isProceedToRunModal, onCloseClick, onConfirmClick } = props
  const { t } = useTranslation(['heater_shaker', 'shared'])
  const [isDismissed, setIsDismissed] = useState<boolean>(false)
  const dispatch = useDispatch<Dispatch>()

  const confirmAttached = (): void => {
    if (isDismissed) {
      dispatch(setHeaterShakerAttached(isDismissed))
    }
    onConfirmClick()
    onCloseClick()
  }

  return (
    <Modal
      title={t('confirm_heater_shaker_modal_attachment')}
      onClose={onCloseClick}
    >
      <Flex
        data-testid={`ConfirmAttachmentModal_body_text_${
          isProceedToRunModal ? `on_start_protocol` : `on_set_shake`
        }`}
        flexDirection={DIRECTION_COLUMN}
        fontSize={TYPOGRAPHY.fontSizeP}
      >
        <LegacyStyledText paddingBottom={SPACING.spacing4}>
          {t(
            isProceedToRunModal
              ? 'module_anchors_extended'
              : 'module_should_have_anchors'
          )}
        </LegacyStyledText>
        <LegacyStyledText>
          {t('thermal_adapter_attached_to_module')}
        </LegacyStyledText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        textAlign={TEXT_ALIGN_CENTER}
        paddingTop={SPACING.spacing16}
        data-testid={`ConfirmAttachmentModal_checkbox_field_${
          isProceedToRunModal ? `on_start_protocol` : `on_set_shake`
        }`}
      >
        <CheckboxField
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setIsDismissed(e.currentTarget.checked)
          }}
          value={isDismissed}
        />
        <LegacyStyledText
          paddingTop="1px"
          paddingLeft={SPACING.spacing8}
          fontSize={TYPOGRAPHY.fontSizeP}
        >
          {t('dont_show_me_again', { ns: 'shared' })}
        </LegacyStyledText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        paddingTop={SPACING.spacing32}
        justifyContent={JUSTIFY_FLEX_END}
        alignItems={ALIGN_CENTER}
      >
        <Flex
          paddingRight={SPACING.spacing4}
          data-testid={`ConfirmAttachmentModal_secondary_btn_${
            isProceedToRunModal ? `on_start_protocol` : `on_set_shake`
          }`}
        >
          <Link
            role="button"
            onClick={onCloseClick}
            textTransform={TYPOGRAPHY.textTransformCapitalize}
            marginRight={SPACING.spacing24}
            css={TYPOGRAPHY.linkPSemiBold}
          >
            {t('shared:cancel')}
          </Link>
        </Flex>

        <Flex
          data-testid={`ConfirmAttachmentModal_primary_btn_${
            isProceedToRunModal ? `on_start_protocol` : `on_set_shake`
          }`}
        >
          <PrimaryButton onClick={confirmAttached}>
            {isProceedToRunModal
              ? t('proceed_to_run')
              : t('confirm_attachment')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </Modal>
  )
}
