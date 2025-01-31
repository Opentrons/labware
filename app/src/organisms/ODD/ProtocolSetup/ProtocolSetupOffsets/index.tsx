import { useTranslation } from 'react-i18next'
import {
  Chip,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  InfoScreen,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  getLabwareDefinitionsFromCommands,
  StyledText,
} from '@opentrons/components'

import type { LabwareOffset } from '@opentrons/api-client'
import { useToaster } from '/app/organisms/ToasterOven'
import { ODDBackButton } from '/app/molecules/ODDBackButton'
import { FloatingActionButton, SmallButton } from '/app/atoms/buttons'
import type { SetupScreens } from '../types'
import { TerseOffsetTable } from '/app/organisms/TerseOffsetTable'
import {
  useNotifyRunQuery,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'
import { getLatestCurrentOffsets } from '/app/transformations/runs'

import type { Dispatch, SetStateAction } from 'react'

export interface ProtocolSetupOffsetsProps {
  runId: string
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
  lpcDisabledReason: string | null
  launchLPC: () => void
  LPCWizard: JSX.Element | null
  isConfirmed: boolean
  setIsConfirmed: (confirmed: boolean) => void
}

export function ProtocolSetupOffsets({
  runId,
  setSetupScreen,
  isConfirmed,
  setIsConfirmed,
  launchLPC,
  lpcDisabledReason,
  LPCWizard,
}: ProtocolSetupOffsetsProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const { makeSnackbar } = useToaster()
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const makeDisabledReasonSnackbar = (): void => {
    if (lpcDisabledReason != null) {
      makeSnackbar(lpcDisabledReason)
    }
  }

  const labwareDefinitions = getLabwareDefinitionsFromCommands(
    mostRecentAnalysis?.commands ?? []
  )
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const currentOffsets = runRecord?.data?.labwareOffsets ?? []
  const sortedOffsets: LabwareOffset[] =
    currentOffsets.length > 0
      ? currentOffsets
          .map(offset => ({
            ...offset,
            //  convert into date to sort
            createdAt: new Date(offset.createdAt),
          }))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(offset => ({
            ...offset,
            //   convert back into string
            createdAt: offset.createdAt.toISOString(),
          }))
      : []
  const nonIdentityOffsets = getLatestCurrentOffsets(sortedOffsets)
  return (
    <>
      {LPCWizard ?? (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          padding={`${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`}
        >
          <Flex
            flexDirection={DIRECTION_ROW}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
          >
            <ODDBackButton
              label={t('labware_position_check')}
              onClick={() => {
                setSetupScreen('prepare to run')
              }}
            />
            {isConfirmed ? (
              <Chip
                background
                iconName="ot-check"
                text={t('offsets_confirmed')}
                type="success"
              />
            ) : (
              <SmallButton
                buttonText={t('confirm_offsets')}
                disabled={nonIdentityOffsets.length === 0}
                onClick={() => {
                  setIsConfirmed(true)
                  setSetupScreen('prepare to run')
                }}
                buttonCategory="rounded"
              />
            )}
          </Flex>
          <Flex marginTop={SPACING.spacing32} flexDirection={DIRECTION_COLUMN}>
            {nonIdentityOffsets.length > 0 ? (
              <>
                <StyledText
                  oddStyle="level4HeaderSemiBold"
                  marginBottom={SPACING.spacing8}
                >
                  {t('applied_labware_offset_data')}
                </StyledText>
                <TerseOffsetTable
                  offsets={nonIdentityOffsets}
                  labwareDefinitions={labwareDefinitions}
                />
              </>
            ) : (
              <InfoScreen content={t('no_labware_offset_data')} />
            )}
          </Flex>
          <FloatingActionButton
            buttonText={t('update_offsets')}
            iconName="reticle"
            onClick={() => {
              if (lpcDisabledReason != null) {
                makeDisabledReasonSnackbar()
              } else {
                launchLPC()
              }
            }}
          />
        </Flex>
      )}
    </>
  )
}
