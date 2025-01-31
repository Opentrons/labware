import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import { SPACING, TYPOGRAPHY, COLORS } from '@opentrons/components'

import { OffsetVector } from '/app/molecules/OffsetVector'
import { formatTimestamp } from '/app/transformations/runs'
import { getDisplayLocation } from '/app/organisms/LegacyLabwarePositionCheck/utils/getDisplayLocation'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { OffsetCandidate } from './hooks/useOffsetCandidatesForAnalysis'
import type { TFunction } from 'i18next'

const OffsetTable = styled('table')`
  ${TYPOGRAPHY.labelRegular}
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing2};
  margin: ${SPACING.spacing16} 0;
  text-align: left;
`
const OffsetTableHeader = styled('th')`
  text-transform: ${TYPOGRAPHY.textTransformCapitalize};
  padding: ${SPACING.spacing4};
`
const OffsetTableRow = styled('tr')`
  background-color: ${COLORS.grey10};
  padding: ${SPACING.spacing8};
`

const OffsetTableDatum = styled('td')`
  padding: ${SPACING.spacing8};
  white-space: break-spaces;
  text-overflow: wrap;
`

interface LabwareOffsetTableProps {
  offsetCandidates: OffsetCandidate[]
  labwareDefinitions: LabwareDefinition2[]
}

export function LabwareOffsetTable(
  props: LabwareOffsetTableProps
): JSX.Element | null {
  const { offsetCandidates, labwareDefinitions } = props
  const { t, i18n } = useTranslation('labware_position_check')
  return (
    <OffsetTable>
      <thead>
        <tr>
          <OffsetTableHeader>{t('location')}</OffsetTableHeader>
          <OffsetTableHeader>{t('run')}</OffsetTableHeader>
          <OffsetTableHeader>{t('labware')}</OffsetTableHeader>
          <OffsetTableHeader>{t('labware_offset_data')}</OffsetTableHeader>
        </tr>
      </thead>
      <tbody>
        {offsetCandidates.map(offset => (
          <OffsetTableRow key={offset.id}>
            <OffsetTableDatum>
              {getDisplayLocation(
                offset.location,
                labwareDefinitions,
                t as TFunction,
                i18n
              )}
            </OffsetTableDatum>
            <OffsetTableDatum>
              {formatTimestamp(offset.runCreatedAt)}
            </OffsetTableDatum>
            <OffsetTableDatum>{offset.labwareDisplayName}</OffsetTableDatum>
            <OffsetTableDatum>
              <OffsetVector {...offset.vector} />
            </OffsetTableDatum>
          </OffsetTableRow>
        ))}
      </tbody>
    </OffsetTable>
  )
}
