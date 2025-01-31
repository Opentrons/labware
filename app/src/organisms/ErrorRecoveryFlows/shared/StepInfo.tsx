import { useTranslation } from 'react-i18next'

import { Flex, DISPLAY_INLINE, StyledText } from '@opentrons/components'

import { CommandText } from '/app/molecules/Command'

import type { ComponentProps } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { RecoveryContentProps } from '../types'

interface StepInfoProps extends StyleProps {
  stepCounts: RecoveryContentProps['stepCounts']
  failedCommand: RecoveryContentProps['failedCommand']
  robotType: RecoveryContentProps['robotType']
  protocolAnalysis: RecoveryContentProps['protocolAnalysis']
  allRunDefs: RecoveryContentProps['allRunDefs']
  desktopStyle?: ComponentProps<typeof StyledText>['desktopStyle']
  oddStyle?: ComponentProps<typeof StyledText>['oddStyle']
}

export function StepInfo({
  desktopStyle,
  oddStyle,
  stepCounts,
  failedCommand,
  robotType,
  protocolAnalysis,
  allRunDefs,
  ...styleProps
}: StepInfoProps): JSX.Element {
  const { t } = useTranslation('error_recovery')
  const { currentStepNumber, totalStepCount, hasRunDiverged } = stepCounts

  const currentCopy = currentStepNumber ?? '?'
  const totalCopy = totalStepCount ?? '?'

  const desktopStyleDefaulted = desktopStyle ?? 'bodyDefaultRegular'
  const oddStyleDefaulted = oddStyle ?? 'bodyTextRegular'

  const buildAtStepCopy = (): string =>
    hasRunDiverged
      ? `${t('at_step')}: N/A`
      : `${t('at_step')} ${currentCopy}/${totalCopy}: `

  return (
    <Flex display={DISPLAY_INLINE} {...styleProps}>
      <StyledText
        desktopStyle={desktopStyleDefaulted}
        oddStyle={oddStyleDefaulted}
        display={DISPLAY_INLINE}
      >
        {buildAtStepCopy()}
      </StyledText>
      {failedCommand?.byAnalysis != null && protocolAnalysis != null ? (
        <CommandText
          command={failedCommand.byAnalysis}
          commandTextData={protocolAnalysis}
          robotType={robotType}
          display={DISPLAY_INLINE}
          modernStyledTextDefaults={true}
          desktopStyle={desktopStyleDefaulted}
          oddStyle={oddStyleDefaulted}
          allRunDefs={allRunDefs}
        />
      ) : null}
    </Flex>
  )
}
