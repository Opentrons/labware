import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  ALIGN_STRETCH,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  PrimaryButton,
  SIZE_3,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { MouseEventHandler, ReactNode } from 'react'

interface CompleteConfirmationProps {
  proceed: MouseEventHandler
  flowName?: string
  body?: string
  visualAid?: ReactNode
}

export function CompleteConfirmation(
  props: CompleteConfirmationProps
): JSX.Element {
  const { t } = useTranslation('shared')
  const { proceed, flowName, body, visualAid } = props
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      padding={SPACING.spacing32}
      minHeight="32rem"
    >
      <Flex
        flex="1"
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
      >
        {visualAid != null ? (
          visualAid
        ) : (
          <Icon name="ot-check" size={SIZE_3} color={COLORS.green50} />
        )}
        <LegacyStyledText as="h1" marginTop={SPACING.spacing24}>
          {t('flow_complete', { flowName })}
        </LegacyStyledText>
        {body != null ? (
          <LegacyStyledText as="p" marginTop={SPACING.spacing8}>
            {body}
          </LegacyStyledText>
        ) : null}
      </Flex>
      <Flex
        flex="0"
        alignSelf={ALIGN_STRETCH}
        marginTop={SPACING.spacing32}
        justifyContent={JUSTIFY_FLEX_END}
      >
        <PrimaryButton
          onClick={proceed}
          textTransform={TYPOGRAPHY.textTransformCapitalize}
        >
          {t('exit')}
        </PrimaryButton>
      </Flex>
    </Flex>
  )
}
