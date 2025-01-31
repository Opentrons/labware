import { Fragment } from 'react'
import styled from 'styled-components'
import isEqual from 'lodash/isEqual'
import { useTranslation } from 'react-i18next'

import {
  getLabwareDefURI,
  getLabwareDisplayName,
  getModuleType,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'
import {
  BORDERS,
  COLORS,
  DeckInfoLabel,
  Flex,
  MODULE_ICON_NAME_BY_TYPE,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  DIRECTION_ROW,
} from '@opentrons/components'

import type { LegacyLabwareOffsetCreateData } from '@opentrons/api-client'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface TerseOffsetTableProps {
  offsets: LegacyLabwareOffsetCreateData[]
  labwareDefinitions: LabwareDefinition2[]
}

// Very similar to the OffsetTable, but abbreviates certain things to be optimized
// for smaller screens.
export function TerseOffsetTable({
  offsets,
  labwareDefinitions,
}: TerseOffsetTableProps): JSX.Element {
  const { i18n, t } = useTranslation('labware_position_check')
  return (
    <TerseTable>
      <thead>
        <tr>
          <TerseHeader>
            {i18n.format(t('slot_location'), 'capitalize')}
          </TerseHeader>
          <TerseHeader>{i18n.format(t('labware'), 'capitalize')}</TerseHeader>
          <TerseHeader>{i18n.format(t('offsets'), 'capitalize')}</TerseHeader>
        </tr>
      </thead>

      <tbody>
        {offsets.map(({ location, definitionUri, vector }, index) => {
          const labwareDef = labwareDefinitions.find(
            def => getLabwareDefURI(def) === definitionUri
          )
          const labwareDisplayName =
            labwareDef != null ? getLabwareDisplayName(labwareDef) : ''
          return (
            <TerseTableRow key={index}>
              <TerseTableDatum>
                <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing4}>
                  <DeckInfoLabel deckLabel={location.slotName} />
                  {location.moduleModel != null ? (
                    <DeckInfoLabel
                      iconName={
                        MODULE_ICON_NAME_BY_TYPE[
                          getModuleType(location.moduleModel)
                        ]
                      }
                    />
                  ) : null}
                </Flex>
              </TerseTableDatum>
              <TerseTableDatum>
                <LegacyStyledText
                  fontSize={TYPOGRAPHY.fontSize20}
                  lineHeight={TYPOGRAPHY.lineHeight24}
                >
                  {labwareDisplayName}
                </LegacyStyledText>
              </TerseTableDatum>
              <TerseTableDatum>
                {isEqual(vector, IDENTITY_VECTOR) ? (
                  <LegacyStyledText>{t('no_labware_offsets')}</LegacyStyledText>
                ) : (
                  <Flex>
                    {[vector.x, vector.y, vector.z].map((axis, index) => (
                      <Fragment key={index}>
                        <LegacyStyledText
                          fontSize={TYPOGRAPHY.fontSize20}
                          lineHeight={TYPOGRAPHY.lineHeight24}
                          marginLeft={index > 0 ? SPACING.spacing8 : 0}
                          marginRight={SPACING.spacing4}
                          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                        >
                          {['X', 'Y', 'Z'][index]}
                        </LegacyStyledText>
                        <LegacyStyledText
                          fontSize={TYPOGRAPHY.fontSize20}
                          lineHeight={TYPOGRAPHY.lineHeight24}
                        >
                          {axis.toFixed(1)}
                        </LegacyStyledText>
                      </Fragment>
                    ))}
                  </Flex>
                )}
              </TerseTableDatum>
            </TerseTableRow>
          )
        })}
      </tbody>
    </TerseTable>
  )
}

const TerseTable = styled('table')`
  table-layout: auto;
  width: 100%;
  border-spacing: 0 ${SPACING.spacing4};
  margin: ${SPACING.spacing16} 0;
  text-align: left;
  tr td:first-child {
    border-top-left-radius: ${BORDERS.borderRadius8};
    border-bottom-left-radius: ${BORDERS.borderRadius8};
    padding-left: ${SPACING.spacing12};
  }
  tr td:last-child {
    border-top-right-radius: ${BORDERS.borderRadius8};
    border-bottom-right-radius: ${BORDERS.borderRadius8};
    padding-right: ${SPACING.spacing12};
  }
`
const TerseHeader = styled('th')`
  font-size: ${TYPOGRAPHY.fontSize20};
  line-height: ${TYPOGRAPHY.lineHeight24};
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
`
const TerseTableRow = styled('tr')`
  background-color: ${COLORS.grey35};
`

const TerseTableDatum = styled('td')`
  padding: ${SPACING.spacing12} 0;
  white-space: break-spaces;
  text-overflow: wrap;
`
