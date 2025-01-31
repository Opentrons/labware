import styled from 'styled-components'
import {
  Flex,
  StyledText,
  LargeButton,
  COLORS,
  JUSTIFY_SPACE_BETWEEN,
  DIRECTION_COLUMN,
  SIZE_AUTO,
  DIRECTION_ROW,
  ALIGN_CENTER,
  SPACING,
} from '@opentrons/components'
import { PromptPreviewSection } from '../PromptPreviewSection'
import type { PromptPreviewSectionProps } from '../PromptPreviewSection'
import { useTranslation } from 'react-i18next'

interface PromptPreviewProps {
  isSubmitButtonEnabled?: boolean
  handleSubmit: () => void
  promptPreviewData: PromptPreviewSectionProps[]
}

const PromptPreviewContainer = styled(Flex)`
  flex-direction: ${DIRECTION_COLUMN};
  width: 100%;
  height: ${SIZE_AUTO};
  padding-top: ${SPACING.spacing8};
  background-color: ${COLORS.transparent};
`

const PromptPreviewHeading = styled(Flex)`
  width: 100%;
  flex-direction: ${DIRECTION_ROW};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
  margin-bottom: ${SPACING.spacing16};
`

const PromptPreviewPlaceholderMessage = styled(StyledText)`
  padding: 82px 73px;
  color: ${COLORS.grey60};
  text-align: ${ALIGN_CENTER};
`

export function PromptPreview({
  isSubmitButtonEnabled = false,
  handleSubmit,
  promptPreviewData = [],
}: PromptPreviewProps): JSX.Element {
  const { t } = useTranslation('protocol_generator')

  const areAllSectionsEmpty = (): boolean => {
    return promptPreviewData.every(section => section.items.length === 0)
  }

  return (
    <PromptPreviewContainer>
      <PromptPreviewHeading>
        <StyledText desktopStyle="headingLargeBold">Prompt</StyledText>
        <LargeButton
          buttonText={t('prompt_preview_submit_button')}
          disabled={!isSubmitButtonEnabled}
          onClick={handleSubmit}
        />
      </PromptPreviewHeading>

      {areAllSectionsEmpty() && (
        <PromptPreviewPlaceholderMessage desktopStyle="headingSmallRegular">
          {t('prompt_preview_placeholder_message')}
        </PromptPreviewPlaceholderMessage>
      )}

      {Object.values(promptPreviewData).map(
        (section, index) =>
          section.items.length > 0 && (
            <PromptPreviewSection
              key={`section-${index}`}
              title={section.title}
              items={section.items}
              itemMaxWidth={index === 1 ? '50%' : '100%'}
              oneItemPerRow={index === 4}
            />
          )
      )}
    </PromptPreviewContainer>
  )
}
