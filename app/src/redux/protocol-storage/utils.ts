import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'
import type { GroupedCommands } from './types'

export const getGroupedCommands = (
  mostRecentAnalysis: ProtocolAnalysisOutput | CompletedProtocolAnalysis
): GroupedCommands => {
  const annotations = mostRecentAnalysis?.commandAnnotations ?? []
  return mostRecentAnalysis.commands.reduce<GroupedCommands>((acc, c) => {
    const foundAnnotationIndex = annotations.findIndex(
      a => c.key != null && a.commandKeys.includes(c.key)
    )
    const lastAccNode = acc[acc.length - 1]
    if (
      acc.length > 0 &&
      c.key != null &&
      'annotationIndex' in lastAccNode &&
      lastAccNode.annotationIndex != null &&
      annotations[lastAccNode.annotationIndex]?.commandKeys.includes(c.key)
    ) {
      return [
        ...acc.slice(0, -1),
        {
          ...lastAccNode,
          subCommands: [
            ...lastAccNode.subCommands,
            { command: c, isHighlighted: false },
          ],
          isHighlighted: false,
        },
      ]
    } else if (foundAnnotationIndex >= 0) {
      return [
        ...acc,
        {
          annotationIndex: foundAnnotationIndex,
          subCommands: [{ command: c, isHighlighted: false }],
          isHighlighted: false,
        },
      ]
    } else {
      return [...acc, { command: c, isHighlighted: false }]
    }
  }, [])
}
