import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  InputField,
} from '@opentrons/components'
import { capitalizeFirstLetter } from '../../pages/Designer/ProtocolSteps/StepForm/utils'
import { getMainPagePortalEl } from '../Portal'
import { renameStep } from '../../labware-ingred/actions'
import type { FormData } from '../../form-types'

const MAX_STEP_NAME_LENGTH = 60
interface RenameStepModalProps {
  formData: FormData
  onClose: () => void
}
export function RenameStepModal(props: RenameStepModalProps): JSX.Element {
  const { onClose, formData } = props
  const dispatch = useDispatch()
  const { t } = useTranslation(['form', 'shared', 'protocol_steps'])
  const initialName = capitalizeFirstLetter(String(formData.stepName))
  const [stepName, setStepName] = useState<string>(initialName)
  const [stepDetails, setStepDetails] = useState<string>(
    String(formData.stepDetails)
  )

  const handleSave = (): void => {
    const { stepId } = formData
    dispatch(
      renameStep({
        stepId,
        update: {
          stepName: stepName !== '' ? stepName : initialName,
          stepDetails: stepDetails,
        },
      })
    )
    onClose()
  }

  return createPortal(
    <Modal
      marginLeft="0"
      title={t('shared:name_step')}
      type="info"
      closeOnOutsideClick
      onClose={onClose}
      childrenPadding={SPACING.spacing24}
      footer={
        <Flex
          justifyContent={JUSTIFY_END}
          padding={`0 ${SPACING.spacing24} ${SPACING.spacing24}`}
          gridGap={SPACING.spacing8}
        >
          <SecondaryButton onClick={onClose}>
            {t('shared:cancel')}
          </SecondaryButton>
          <PrimaryButton
            data-testid="RenameStepModal_saveButton"
            disabled={stepName.length >= MAX_STEP_NAME_LENGTH}
            onClick={() => {
              handleSave()
            }}
          >
            {t('shared:save')}
          </PrimaryButton>
        </Flex>
      }
    >
      <form>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText color={COLORS.grey60} desktopStyle="captionRegular">
              {t('form:step_edit_form.field.step_name.label')}
            </StyledText>
            <InputField
              error={
                stepName.length >= MAX_STEP_NAME_LENGTH
                  ? t('protocol_steps:rename_error')
                  : null
              }
              value={stepName}
              autoFocus
              onChange={e => {
                setStepName(e.target.value)
              }}
              type="text"
            />
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText color={COLORS.grey60} desktopStyle="captionRegular">
              {t('form:step_edit_form.field.step_notes.label')}
            </StyledText>

            <DescriptionField
              value={stepDetails}
              onChange={e => {
                setStepDetails(e.target.value)
              }}
            />
          </Flex>
        </Flex>
      </form>
    </Modal>,
    getMainPagePortalEl()
  )
}

const DescriptionField = styled.textarea`
  min-height: 5rem;
  width: 100%;
  border: ${BORDERS.lineBorder};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  font-size: ${TYPOGRAPHY.fontSizeH3};
  resize: none;
`
