import styled from 'styled-components'
import {
  Flex,
  StyledText,
  Tag,
  DIRECTION_COLUMN,
  WRAP,
  SPACING,
} from '@opentrons/components'

export interface PromptPreviewSectionProps {
  title: string
  items: string[]
  itemMaxWidth?: string
  oneItemPerRow?: boolean
}

const PromptPreviewSectionContainer = styled(Flex)`
  flex-direction: ${DIRECTION_COLUMN};
  margin-top: ${SPACING.spacing32};
`

const SectionHeading = styled(StyledText)`
  margin-bottom: ${SPACING.spacing8};
`

const TagsContainer = styled.div<{
  oneItemPerRow: boolean
}>`
  display: flex;
  grid-gap: ${SPACING.spacing4};
  flex-wrap: ${WRAP};
  justify-content: flex-start;
  width: 100%;
  flex-direction: ${props => (Boolean(props.oneItemPerRow) ? 'column' : 'row')};
`

const TagItemWrapper = styled.div<{
  itemMaxWidth: string
}>`
  display: flex;
  width: auto;
  white-space: nowrap;
  overflow: hidden;
  max-width: ${props => props.itemMaxWidth};

  & > div {
    overflow: hidden;

    > p {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`

export function PromptPreviewSection({
  title,
  items,
  itemMaxWidth = '35%',
  oneItemPerRow = false,
}: PromptPreviewSectionProps): JSX.Element {
  return (
    <PromptPreviewSectionContainer>
      <SectionHeading desktopStyle="bodyLargeSemiBold">{title}</SectionHeading>
      <TagsContainer oneItemPerRow={oneItemPerRow}>
        {items.map(
          (item: string, index: number) =>
            item.trim() !== '' && (
              <TagItemWrapper
                data-testid={`item-tag-wrapper-${index}`}
                key={`item-tag-${index}`}
                itemMaxWidth={itemMaxWidth}
              >
                <Tag text={item} type="default" />
              </TagItemWrapper>
            )
        )}
      </TagsContainer>
    </PromptPreviewSectionContainer>
  )
}
