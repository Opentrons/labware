import * as React from 'react'
import { useTranslation } from 'react-i18next'
import map from 'lodash/map'
import {
  JUSTIFY_CENTER,
  Flex,
  SPACING,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import {
  useFeatureFlag,
} from '../../../../redux/config'
import { useToggleGroup } from '../../../../molecules/ToggleGroup/useToggleGroup'
import {
  PrimaryButton,
} from '../../../../atoms/buttons'
import { getModuleTypesThatRequireExtraAttention } from '../../../ProtocolSetup/RunSetupCard/LabwareSetup/utils/getModuleTypesThatRequireExtraAttention'
import { ReapplyOffsetsModal } from '../../../ReapplyOffsetsModal'
import { useCurrentRun } from '../../../ProtocolUpload/hooks'
import {
  useModuleRenderInfoForProtocolById,
  useProtocolDetailsForRun,
  useStoredProtocolAnalysis,
} from '../../hooks'
import { ProceedToRunButton } from '../ProceedToRunButton'
import { SetupLabwareMap } from './SetupLabwareMap'
import { SetupLabwareList } from './SetupLabwareList'
import type { StepKey } from '../ProtocolRunSetup'
import { LaunchLabwarePositionCheck } from './LaunchLabwarePositionCheck'

interface SetupLabwareProps {
  protocolRunHeaderRef: React.RefObject<HTMLDivElement> | null
  robotName: string
  runId: string
  nextStep: StepKey | null
  expandStep: (step: StepKey) => void
}

export function SetupLabware(props: SetupLabwareProps): JSX.Element {
  const { robotName, runId, nextStep, expandStep, protocolRunHeaderRef } = props
  const { t } = useTranslation('protocol_setup')
  const enableLiquidSetup = useFeatureFlag('enableLiquidSetup')
  const { protocolData: robotProtocolAnalysis } = useProtocolDetailsForRun(
    runId
  )
  const storedProtocolAnalysis = useStoredProtocolAnalysis(runId)
  const protocolData = robotProtocolAnalysis ?? storedProtocolAnalysis
  const [selectedValue, toggleGroup] = useToggleGroup(
    t('list_view'),
    t('map_view')
  )
  /**
   * This component's usage of the reapply offsets modal can be removed
   * along with the enableManualDeckStateMod feature flag.
   */
  const enableManualDeckStateMod = useFeatureFlag(
    'enableManualDeckStateModification'
  )
  const moduleRenderInfoById = useModuleRenderInfoForProtocolById(
    robotName,
    runId
  )
  const moduleModels = map(
    moduleRenderInfoById,
    ({ moduleDef }) => moduleDef.model
  )
  const moduleTypesThatRequireExtraAttention = getModuleTypesThatRequireExtraAttention(
    moduleModels
  )
  const currentRun = useCurrentRun()

  const showReapplyOffsetsModal =
    !enableManualDeckStateMod &&
    currentRun?.data.id === runId &&
    (currentRun?.data?.labwareOffsets == null ||
      currentRun?.data?.labwareOffsets.length === 0)

  return (
    <>
      {showReapplyOffsetsModal ? <ReapplyOffsetsModal runId={runId} /> : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_CENTER}
        marginTop={SPACING.spacing6}
        gridGap={SPACING.spacing4}
      >
        {enableLiquidSetup ? (
          <>
            {toggleGroup}
            {selectedValue === t('list_view') ? (
              <SetupLabwareList
                attachedModuleInfo={moduleRenderInfoById}
                commands={protocolData?.commands ?? []}
                extraAttentionModules={moduleTypesThatRequireExtraAttention}
              />
            ) : (
              <SetupLabwareMap
                runId={runId}
                commands={protocolData?.commands ?? []}
                robotName={robotName}
                extraAttentionModules={moduleTypesThatRequireExtraAttention}
              />
            )}
          </>
        ) : (
          <SetupLabwareMap
            runId={runId}
            commands={protocolData?.commands ?? []}
            robotName={robotName}
            extraAttentionModules={moduleTypesThatRequireExtraAttention}
          />
        )}
        <LaunchLabwarePositionCheck robotName={robotName} runId={runId} />
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER} marginTop={SPACING.spacing4}>
        {nextStep == null ? (
          <ProceedToRunButton
            protocolRunHeaderRef={protocolRunHeaderRef}
            robotName={robotName}
            runId={runId}
          />
        ) : (
          <PrimaryButton onClick={() => expandStep(nextStep)}>
            {t('proceed_to_liquid_setup_step')}
          </PrimaryButton>
        )}
      </Flex>
    </>
  )
}
