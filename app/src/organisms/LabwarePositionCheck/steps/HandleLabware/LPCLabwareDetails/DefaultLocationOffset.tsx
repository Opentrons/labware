import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ListButton,
  Flex,
  Tag,
  StyledText,
  PrimaryButton,
  Icon,
  SPACING,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
} from '@opentrons/components'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function DefaultLocationOffset(
  props: LPCWizardContentProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  return (
    <ListButton type="noActive">
      <Flex css={BUTTON_ALL_CONTENT_STYLE}>
        <Flex css={BUTTON_LEFT_CONTENT_STYLE}>
          <StyledText oddStyle="level4HeaderSemiBold">
            {t('default_labware_offset')}
          </StyledText>
          <Flex>
            <Tag type="default" text={t('no_offset_data')} />
          </Flex>
        </Flex>
        <PrimaryButton disabled={true}>
          <Flex css={BUTTON_TEXT_CONTAINER_STYLE}>
            <Icon name="add" css={ADD_ICON_STYLE} />
            <StyledText>{t('add')}</StyledText>
          </Flex>
        </PrimaryButton>
      </Flex>
    </ListButton>
  )
}

const BUTTON_ALL_CONTENT_STYLE = css`
  grid-gap: ${SPACING.spacing24};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  width: 100%;
`

const BUTTON_LEFT_CONTENT_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
`

const BUTTON_TEXT_CONTAINER_STYLE = css`
  grid-gap: ${SPACING.spacing8};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
`

const ADD_ICON_STYLE = css`
  width: 1.75rem;
  height: 1.75rem;
`
