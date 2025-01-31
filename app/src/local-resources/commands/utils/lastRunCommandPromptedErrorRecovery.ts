import type { RunCommandSummary } from '@opentrons/api-client'
// Whether the last run protocol command prompted Error Recovery, if Error Recovery is enabled.
export function lastRunCommandPromptedErrorRecovery(
  summary: RunCommandSummary[] | null,
  isEREnabled: boolean
): boolean {
  const lastProtocolCommand = summary?.findLast(
    command => command.intent !== 'fixit' && command.error != null
  )
  // All recoverable protocol commands have defined errors.
  return isEREnabled ? lastProtocolCommand?.error?.isDefined ?? false : false
}
