import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import pick from 'lodash/pick'
import { Trans, useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  CheckboxField,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SIZE_1,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  ModalHeader,
  ModalShell,
  getLabwareDefinitionsFromCommands,
} from '@opentrons/components'
import { getTopPortalEl } from '/app/App/portal'
import { ExternalLink } from '/app/atoms/Link/ExternalLink'
import { PythonLabwareOffsetSnippet } from '/app/molecules/PythonLabwareOffsetSnippet'
import { LabwareOffsetTabs } from '/app/organisms/LabwareOffsetTabs'
import { LabwareOffsetTable } from './LabwareOffsetTable'
import { getIsLabwareOffsetCodeSnippetsOn } from '/app/redux/config'

import type { ChangeEvent } from 'react'
import type { LabwareOffset } from '@opentrons/api-client'
import type {
  LoadedLabware,
  LoadedModule,
  RunTimeCommand,
} from '@opentrons/shared-data'

const HOW_OFFSETS_WORK_SUPPORT_URL =
  'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'
export interface OffsetCandidate extends LabwareOffset {
  runCreatedAt: string
  labwareDisplayName: string
}

interface LegacyApplyHistoricOffsetsProps {
  offsetCandidates: OffsetCandidate[]
  shouldApplyOffsets: boolean
  setShouldApplyOffsets: (shouldApplyOffsets: boolean) => void
  commands: RunTimeCommand[]
  labware: LoadedLabware[]
  modules: LoadedModule[]
}
export function LegacyApplyHistoricOffsets(
  props: LegacyApplyHistoricOffsetsProps
): JSX.Element {
  const {
    offsetCandidates,
    shouldApplyOffsets,
    setShouldApplyOffsets,
    labware,
    modules,
    commands,
  } = props
  const [showOffsetDataModal, setShowOffsetDataModal] = useState(false)
  const { t } = useTranslation('labware_position_check')
  const isLabwareOffsetCodeSnippetsOn = useSelector(
    getIsLabwareOffsetCodeSnippetsOn
  )
  const JupyterSnippet = (
    <PythonLabwareOffsetSnippet
      mode="jupyter"
      labwareOffsets={offsetCandidates.map(o =>
        pick(o, ['definitionUri', 'vector', 'location'])
      )}
      {...{ labware, modules, commands }}
    />
  )
  const CommandLineSnippet = (
    <PythonLabwareOffsetSnippet
      mode="cli"
      labwareOffsets={offsetCandidates.map(o =>
        pick(o, ['definitionUri', 'vector', 'location'])
      )}
      {...{ labware, modules, commands }}
    />
  )
  const noOffsetData = offsetCandidates.length < 1
  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <CheckboxField
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setShouldApplyOffsets(e.currentTarget.checked)
        }}
        value={shouldApplyOffsets}
        disabled={noOffsetData}
        isIndeterminate={noOffsetData}
        label={
          <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing4}>
            <Icon size={SIZE_1} name="reticle" />
            <LegacyStyledText as="p">
              {t(noOffsetData ? 'legacy_no_offset_data' : 'apply_offset_data')}
            </LegacyStyledText>
          </Flex>
        }
      />
      <Link
        onClick={() => {
          setShowOffsetDataModal(true)
        }}
        css={TYPOGRAPHY.linkPSemiBold}
      >
        {t(noOffsetData ? 'learn_more' : 'view_data')}
      </Link>
      {showOffsetDataModal
        ? createPortal(
            <ModalShell
              maxWidth="40rem"
              header={
                <ModalHeader
                  title={t(
                    noOffsetData
                      ? 'what_is_labware_offset_data'
                      : 'stored_offset_data'
                  )}
                  onClose={() => {
                    setShowOffsetDataModal(false)
                  }}
                />
              }
            >
              <Flex
                flexDirection={DIRECTION_COLUMN}
                padding={
                  noOffsetData
                    ? `${SPACING.spacing16} ${SPACING.spacing32} ${SPACING.spacing32}`
                    : SPACING.spacing32
                }
              >
                {noOffsetData ? (
                  <Trans
                    t={t}
                    i18nKey={'robot_has_no_offsets_from_previous_runs'}
                    components={{
                      block: (
                        <LegacyStyledText
                          as="p"
                          marginBottom={SPACING.spacing8}
                        />
                      ),
                    }}
                  />
                ) : (
                  <LegacyStyledText as="p">
                    {t('robot_has_offsets_from_previous_runs')}
                  </LegacyStyledText>
                )}
                <ExternalLink
                  marginTop={noOffsetData ? '0px' : SPACING.spacing8}
                  href={HOW_OFFSETS_WORK_SUPPORT_URL}
                >
                  {t('see_how_offsets_work')}
                </ExternalLink>
                {!noOffsetData ? (
                  isLabwareOffsetCodeSnippetsOn ? (
                    <LabwareOffsetTabs
                      TableComponent={
                        <LabwareOffsetTable
                          offsetCandidates={offsetCandidates}
                          labwareDefinitions={getLabwareDefinitionsFromCommands(
                            commands
                          )}
                        />
                      }
                      JupyterComponent={JupyterSnippet}
                      CommandLineComponent={CommandLineSnippet}
                    />
                  ) : (
                    <LabwareOffsetTable
                      offsetCandidates={offsetCandidates}
                      labwareDefinitions={getLabwareDefinitionsFromCommands(
                        commands
                      )}
                    />
                  )
                ) : null}
              </Flex>
            </ModalShell>,
            getTopPortalEl()
          )
        : null}
    </Flex>
  )
}
