import type { CreateCommand } from '@opentrons/shared-data'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

export function moveLabwareOffDeckCommands(
  offsetLocationDetails: OffsetLocationDetails
): CreateCommand[] {
  const { adapterId, labwareId } = offsetLocationDetails

  return adapterId != null
    ? [
        {
          commandType: 'moveLabware' as const,
          params: {
            labwareId,
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
        {
          commandType: 'moveLabware' as const,
          params: {
            labwareId: adapterId,
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
      ]
    : [
        {
          commandType: 'moveLabware' as const,
          params: {
            labwareId,
            newLocation: 'offDeck',
            strategy: 'manualMoveWithoutPause',
          },
        },
      ]
}
