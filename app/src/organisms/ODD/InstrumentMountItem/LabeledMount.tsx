import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TEXT_TRANSFORM_CAPITALIZE,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { MouseEventHandler } from 'react'
import type { Mount } from '/app/redux/pipettes/types'

const MountButton = styled.button<{ isAttached: boolean }>`
  display: flex;
  width: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_FLEX_START};
  padding: ${SPACING.spacing24};
  border-radius: ${BORDERS.borderRadius12};
  background-color: ${({ isAttached }) =>
    isAttached ? COLORS.green35 : COLORS.grey35};
  &:active {
    background-color: ${({ isAttached }) =>
      isAttached ? COLORS.green40 : COLORS.grey40};
  }
`
interface LabeledMountProps {
  mount: Mount | 'extension'
  instrumentName: string | null
  handleClick: MouseEventHandler
}

export function LabeledMount(props: LabeledMountProps): JSX.Element {
  const { t } = useTranslation('device_details')
  const { mount, instrumentName, handleClick } = props
  const isNinetySixChannel = instrumentName?.includes('96-Channel') ?? false

  return (
    <MountButton onClick={handleClick} isAttached={instrumentName != null}>
      <Flex
        width="100%"
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
      >
        <Flex
          flex="1 0 auto"
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing24}
        >
          <LegacyStyledText
            as="h4"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            textAlign={TYPOGRAPHY.textAlignLeft}
            textTransform={TEXT_TRANSFORM_CAPITALIZE}
            fontSize={TYPOGRAPHY.fontSize28}
            width="15.625rem"
          >
            {isNinetySixChannel ? t('left_right') : t('mount', { side: mount })}
          </LegacyStyledText>
          <LegacyStyledText
            flex="5"
            as="h4"
            color={COLORS.grey60}
            textAlign={TYPOGRAPHY.textAlignLeft}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
            fontSize={TYPOGRAPHY.fontSize28}
          >
            {instrumentName == null ? t('empty') : instrumentName}
          </LegacyStyledText>
        </Flex>
        <Icon name="more" size="3rem" />
      </Flex>
    </MountButton>
  )
}
