import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_FLEX_END,
  AlertPrimaryButton,
  COLORS,
  Flex,
  Icon,
  Modal,
  SPACING,
  SecondaryButton,
  StyledText,
} from '@opentrons/components'
import { getMainPagePortalEl } from '../Portal'
import type { MouseEvent } from 'react'

export const DELETE_PROFILE_CYCLE: 'deleteProfileCycle' = 'deleteProfileCycle'
export const CLOSE_STEP_FORM_WITH_CHANGES: 'closeStepFormWithChanges' =
  'closeStepFormWithChanges'
export const CLOSE_UNSAVED_STEP_FORM: 'closeUnsavedStepForm' =
  'closeUnsavedStepForm'
export const CLOSE_BATCH_EDIT_FORM: 'closeBatchEditForm' = 'closeBatchEditForm'
export const DELETE_STEP_FORM: 'deleteStepForm' = 'deleteStepForm'
export const DELETE_MULTIPLE_STEP_FORMS: 'deleteMultipleStepForms' =
  'deleteMultipleStepForms'

export type DeleteModalType =
  | typeof DELETE_PROFILE_CYCLE
  | typeof CLOSE_STEP_FORM_WITH_CHANGES
  | typeof CLOSE_UNSAVED_STEP_FORM
  | typeof DELETE_STEP_FORM
  | typeof CLOSE_BATCH_EDIT_FORM
  | typeof DELETE_MULTIPLE_STEP_FORMS

interface Props {
  modalType: DeleteModalType
  onCancelClick: () => unknown
  // TODO(sa, 2021-7-2): iron out this type, I think the weirdness comes from the return type of onConditionalConfirm
  onContinueClick: ((event: MouseEvent) => unknown) | (() => unknown)
}

export function ConfirmDeleteModal(props: Props): JSX.Element {
  const { i18n, t } = useTranslation(['modal', 'button'])
  const { modalType, onCancelClick, onContinueClick } = props
  const cancelCopy = i18n.format(t('button:cancel'), 'capitalize')
  const continueCopy = i18n.format(
    t(`confirm_delete_modal.${modalType}.confirm_button`, t('button:continue')),
    'capitalize'
  )

  return createPortal(
    <Modal
      marginLeft="0"
      title={t(`confirm_delete_modal.${modalType}.title`)}
      titleElement1={
        <Icon name="alert-circle" color={COLORS.yellow50} size="1.25rem" />
      }
      footer={
        <Flex
          padding={`0 ${SPACING.spacing24} ${SPACING.spacing24}`}
          gridGap={SPACING.spacing8}
          justifyContent={ALIGN_FLEX_END}
        >
          <SecondaryButton onClick={onCancelClick}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {cancelCopy}
            </StyledText>
          </SecondaryButton>
          <AlertPrimaryButton onClick={onContinueClick}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {continueCopy}
            </StyledText>
          </AlertPrimaryButton>
        </Flex>
      }
    >
      <StyledText desktopStyle="bodyDefaultRegular">
        {t(`confirm_delete_modal.${modalType}.body`)}
      </StyledText>
    </Modal>,
    getMainPagePortalEl()
  )
}
