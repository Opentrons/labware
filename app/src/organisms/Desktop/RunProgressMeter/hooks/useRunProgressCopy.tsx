import { useMemo } from 'react'

import {
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_IDLE,
} from '@opentrons/api-client'
import { useTranslation } from 'react-i18next'

import { getCommandTextData } from '/app/local-resources/commands'
import { getLabwareDefinitionsFromCommands } from '/app/local-resources/labware'
import { LegacyStyledText } from '@opentrons/components'
import { CommandText } from '/app/molecules/Command'
import { TERMINAL_RUN_STATUSES } from '../constants'

import type { ReactNode } from 'react'
import type { CommandDetail, RunStatus } from '@opentrons/api-client'
import type {
  CompletedProtocolAnalysis,
  RobotType,
  RunTimeCommand,
} from '@opentrons/shared-data'

interface UseRunProgressResult {
  currentStepContents: ReactNode
  stepCountStr: string | null
  progressPercentage: number
}

interface UseRunProgressProps {
  runStatus: RunStatus | null
  currentStepNumber: number | null
  totalStepCount: number | null
  analysis: CompletedProtocolAnalysis | null
  hasRunDiverged: boolean
  runCommandDetails: CommandDetail | null
  robotType: RobotType
  analysisCommands: RunTimeCommand[]
}

// TODO(jh, 08-05-24): Testing is sufficiently covered by RunProgressMeter, but we should migrate relevant tests to this
// hook after devising a better way to test i18n outside of a component.
export function useRunProgressCopy({
  runStatus,
  currentStepNumber,
  totalStepCount,
  hasRunDiverged,
  runCommandDetails,
  analysisCommands,
  robotType,
  analysis,
}: UseRunProgressProps): UseRunProgressResult {
  const { t } = useTranslation('run_details')

  const runHasNotBeenStarted =
    (currentStepNumber === 0 &&
      runStatus === RUN_STATUS_BLOCKED_BY_OPEN_DOOR) ||
    runStatus === RUN_STATUS_IDLE

  const isValidRobotSideAnalysis = analysis != null
  const allRunDefs = useMemo(
    () =>
      analysis != null
        ? getLabwareDefinitionsFromCommands(analysis.commands)
        : [],
    [isValidRobotSideAnalysis]
  )

  const currentStepContents = ((): JSX.Element | null => {
    if (runHasNotBeenStarted) {
      return <LegacyStyledText as="h2">{t('not_started_yet')}</LegacyStyledText>
    } else if (analysis != null && !hasRunDiverged) {
      return (
        <CommandText
          commandTextData={getCommandTextData(analysis)}
          command={analysisCommands[(currentStepNumber as number) - 1]}
          robotType={robotType}
          allRunDefs={allRunDefs}
        />
      )
    } else if (
      analysis != null &&
      hasRunDiverged &&
      runCommandDetails != null
    ) {
      return (
        <CommandText
          commandTextData={getCommandTextData(analysis)}
          command={runCommandDetails.data}
          robotType={robotType}
          allRunDefs={allRunDefs}
        />
      )
    } else {
      return null
    }
  })()

  const progressPercentage = runHasNotBeenStarted
    ? 0
    : ((currentStepNumber as number) / analysisCommands.length) * 100

  const stepCountStr = ((): string | null => {
    if (runStatus == null) {
      return null
    } else {
      const isTerminalStatus = TERMINAL_RUN_STATUSES.includes(runStatus)
      const stepType = isTerminalStatus ? t('final_step') : t('current_step')

      if (runStatus === RUN_STATUS_IDLE) {
        return `${stepType}:`
      } else if (isTerminalStatus && currentStepNumber == null) {
        return `${stepType}: ${t('na')}`
      } else if (hasRunDiverged) {
        return `${stepType} ${t('na')}:`
      } else {
        const getCountString = (): string => {
          const current = currentStepNumber ?? '?'
          const total = totalStepCount ?? '?'

          return `${current}/${total}`
        }

        const countString = getCountString()

        return `${stepType} ${countString}:`
      }
    }
  })()

  return {
    currentStepContents,
    stepCountStr,
    progressPercentage,
  }
}
