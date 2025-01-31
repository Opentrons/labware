import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import type { ChangeEvent } from 'react'
import type { StepFormProps } from '../../types'

export function CommentTools(props: StepFormProps): JSX.Element {
  const { t, i18n } = useTranslation('form')
  const { propsForFields } = props

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      padding={SPACING.spacing16}
    >
      <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
        {i18n.format(t('step_edit_form.field.comment.label'), 'capitalize')}
      </StyledText>
      <StyledTextArea
        value={propsForFields.message.value as string}
        onChange={(e: ChangeEvent<any>) => {
          propsForFields.message.updateValue(e.currentTarget.value)
        }}
      />
    </Flex>
  )
}

//  TODO: use TextArea component when we make it
const StyledTextArea = styled.textarea`
  width: 100%;
  height: 7rem;
  box-sizing: border-box;
  border: 1px solid ${COLORS.grey50};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  font-size: ${TYPOGRAPHY.fontSizeH4};
  line-height: ${TYPOGRAPHY.lineHeight16};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  resize: none;
`
