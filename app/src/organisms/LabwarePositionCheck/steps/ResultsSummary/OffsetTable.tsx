import { Fragment } from 'react'
import styled from 'styled-components'
import isEqual from 'lodash/isEqual'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { FLEX_ROBOT_TYPE, IDENTITY_VECTOR } from '@opentrons/shared-data'
import {
  BORDERS,
  COLORS,
  Flex,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  getLabwareDisplayLocation,
} from '@opentrons/components'

import { selectLwDisplayName } from '/app/redux/protocol-runs'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { LegacyLabwareOffsetCreateData } from '@opentrons/api-client'
import type {
  LPCStepProps,
  ResultsSummaryStep,
} from '/app/organisms/LabwarePositionCheck/types'
import type { LPCWizardState } from '/app/redux/protocol-runs'
import type { State } from '/app/redux/types'

interface OffsetTableProps extends LPCStepProps<ResultsSummaryStep> {
  offsets: LegacyLabwareOffsetCreateData[]
  labwareDefinitions: LabwareDefinition2[]
}

export function OffsetTable({
  offsets,
  runId,
  labwareDefinitions,
}: OffsetTableProps): JSX.Element {
  const { protocolData } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const lwDisplayName = useSelector((state: State) =>
    selectLwDisplayName(runId, state)
  )

  const { t } = useTranslation('labware_position_check')

  return (
    <Table>
      <thead>
        <tr>
          <TableHeader>{t('location')}</TableHeader>
          <TableHeader>{t('labware')}</TableHeader>
          <TableHeader>{t('labware_offset_data')}</TableHeader>
        </tr>
      </thead>

      <tbody>
        {offsets.map(({ location, vector }, index) => {
          const displayLocation = getLabwareDisplayLocation({
            location,
            allRunDefs: labwareDefinitions,
            detailLevel: 'full',
            t,
            loadedModules: protocolData.modules,
            loadedLabwares: protocolData.labware,
            robotType: FLEX_ROBOT_TYPE,
          })

          return (
            <TableRow key={index}>
              <LeftRoundedTableDatum>
                <LegacyStyledText
                  as="p"
                  textTransform={TYPOGRAPHY.textTransformCapitalize}
                >
                  {displayLocation}
                </LegacyStyledText>
              </LeftRoundedTableDatum>
              <TableDatum>
                <LegacyStyledText as="p">{lwDisplayName}</LegacyStyledText>
              </TableDatum>
              <RightRoundedTableDatum>
                {isEqual(vector, IDENTITY_VECTOR) ? (
                  <LegacyStyledText>{t('no_labware_offsets')}</LegacyStyledText>
                ) : (
                  <Flex>
                    {[vector.x, vector.y, vector.z].map((axis, index) => (
                      <Fragment key={index}>
                        <LegacyStyledText
                          as="p"
                          marginLeft={index > 0 ? SPACING.spacing8 : 0}
                          marginRight={SPACING.spacing4}
                          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                        >
                          {['X', 'Y', 'Z'][index]}
                        </LegacyStyledText>
                        <LegacyStyledText as="p">
                          {axis.toFixed(1)}
                        </LegacyStyledText>
                      </Fragment>
                    ))}
                  </Flex>
                )}
              </RightRoundedTableDatum>
            </TableRow>
          )
        })}
      </tbody>
    </Table>
  )
}

const Table = styled('table')`
  ${TYPOGRAPHY.labelRegular}
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing4};
  margin: ${SPACING.spacing16} 0;
  text-align: left;
`

const TableHeader = styled('th')`
  text-transform: ${TYPOGRAPHY.textTransformUppercase};
  color: ${COLORS.black90};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  padding: ${SPACING.spacing4};
`

const TableRow = styled('tr')`
  background-color: ${COLORS.grey20};
`

const TableDatum = styled('td')`
  padding: ${SPACING.spacing4};
  white-space: break-spaces;
  text-overflow: wrap;
`

const LeftRoundedTableDatum = styled(TableDatum)`
  border-radius: ${BORDERS.borderRadius4} 0 0 ${BORDERS.borderRadius4};
`

const RightRoundedTableDatum = styled(TableDatum)`
  border-radius: 0 ${BORDERS.borderRadius4} ${BORDERS.borderRadius4} 0;
`
