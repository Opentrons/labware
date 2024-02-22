import * as React from 'react'
import path from 'path'
import first from 'lodash/first'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'

import {
  Icon,
  Flex,
  DIRECTION_COLUMN,
  SIZE_1,
  PrimaryButton,
} from '@opentrons/components'

import { getRobotUpdateDisplayInfo } from '../../redux/robot-update'
import { OPENTRONS_USB } from '../../redux/discovery'
import { appShellRequestor } from '../../redux/shell/remote'
import { useTrackCreateProtocolRunEvent } from '../Devices/hooks'
import { ApplyHistoricOffsets } from '../ApplyHistoricOffsets'
import { useOffsetCandidatesForAnalysis } from '../ApplyHistoricOffsets/hooks/useOffsetCandidatesForAnalysis'
import { ChooseRobotSlideout } from '../ChooseRobotSlideout'
import { useCreateRunFromProtocol } from './useCreateRunFromProtocol'

import type { StyleProps } from '@opentrons/components'
import type { State } from '../../redux/types'
import type { Robot } from '../../redux/discovery/types'
import type { StoredProtocolData } from '../../redux/protocol-storage'

interface ChooseRobotToRunProtocolSlideoutProps extends StyleProps {
  storedProtocolData: StoredProtocolData
  onCloseClick: () => void
  showSlideout: boolean
}

export function ChooseRobotToRunProtocolSlideoutComponent(
  props: ChooseRobotToRunProtocolSlideoutProps
): JSX.Element | null {
  const { t } = useTranslation(['protocol_details', 'shared', 'app_settings'])
  const { storedProtocolData, showSlideout, onCloseClick } = props
  const history = useHistory()
  const [shouldApplyOffsets, setShouldApplyOffsets] = React.useState<boolean>(
    true
  )
  const {
    protocolKey,
    srcFileNames,
    srcFiles,
    mostRecentAnalysis,
  } = storedProtocolData

  const [selectedRobot, setSelectedRobot] = React.useState<Robot | null>(null)
  const { trackCreateProtocolRunEvent } = useTrackCreateProtocolRunEvent(
    storedProtocolData,
    selectedRobot?.name ?? ''
  )

  const offsetCandidates = useOffsetCandidatesForAnalysis(
    mostRecentAnalysis,
    selectedRobot?.ip ?? null
  )
  const {
    createRunFromProtocolSource,
    runCreationError,
    reset: resetCreateRun,
    isCreatingRun,
    runCreationErrorCode,
  } = useCreateRunFromProtocol(
    {
      onSuccess: ({ data: runData }) => {
        if (selectedRobot != null) {
          trackCreateProtocolRunEvent({
            name: 'createProtocolRecordResponse',
            properties: { success: true },
          })
          history.push(
            `/devices/${selectedRobot.name}/protocol-runs/${runData.id}`
          )
        }
      },
      onError: (error: Error) => {
        trackCreateProtocolRunEvent({
          name: 'createProtocolRecordResponse',
          properties: { success: false, error: error.message },
        })
      },
    },
    selectedRobot != null
      ? {
          hostname: selectedRobot.ip,
          requestor:
            selectedRobot?.ip === OPENTRONS_USB ? appShellRequestor : undefined,
        }
      : null,
    shouldApplyOffsets
      ? offsetCandidates.map(({ vector, location, definitionUri }) => ({
          vector,
          location,
          definitionUri,
        }))
      : []
  )
  const handleProceed: React.MouseEventHandler<HTMLButtonElement> = () => {
    trackCreateProtocolRunEvent({ name: 'createProtocolRecordRequest' })
    createRunFromProtocolSource({ files: srcFileObjects, protocolKey })
  }

  const { autoUpdateAction } = useSelector((state: State) =>
    getRobotUpdateDisplayInfo(state, selectedRobot?.name ?? '')
  )

  const isSelectedRobotOnDifferentSoftwareVersion = [
    'upgrade',
    'downgrade',
  ].includes(autoUpdateAction)

  if (
    protocolKey == null ||
    srcFileNames == null ||
    srcFiles == null ||
    mostRecentAnalysis == null
  ) {
    // TODO: do more robust corrupt file catching and handling here
    return null
  }
  const srcFileObjects = srcFiles.map((srcFileBuffer, index) => {
    const srcFilePath = srcFileNames[index]
    return new File([srcFileBuffer], path.basename(srcFilePath))
  })
  const protocolDisplayName =
    mostRecentAnalysis?.metadata?.protocolName ??
    first(srcFileNames) ??
    protocolKey

  // intentionally show both robot types if analysis has any error
  const robotType =
    mostRecentAnalysis != null && mostRecentAnalysis.errors.length === 0
      ? mostRecentAnalysis?.robotType ?? null
      : null

  return (
    <ChooseRobotSlideout
      isExpanded={showSlideout}
      isSelectedRobotOnDifferentSoftwareVersion={
        isSelectedRobotOnDifferentSoftwareVersion
      }
      onCloseClick={onCloseClick}
      title={t('choose_robot_to_run', {
        protocol_name: protocolDisplayName,
      })}
      footer={
        <Flex flexDirection={DIRECTION_COLUMN}>
          <ApplyHistoricOffsets
            offsetCandidates={offsetCandidates}
            shouldApplyOffsets={shouldApplyOffsets}
            setShouldApplyOffsets={setShouldApplyOffsets}
            commands={mostRecentAnalysis?.commands ?? []}
            labware={mostRecentAnalysis?.labware ?? []}
            modules={mostRecentAnalysis?.modules ?? []}
          />
          <PrimaryButton
            onClick={handleProceed}
            width="100%"
            disabled={
              isCreatingRun ||
              selectedRobot == null ||
              isSelectedRobotOnDifferentSoftwareVersion
            }
          >
            {isCreatingRun ? (
              <Icon name="ot-spinner" spin size={SIZE_1} />
            ) : (
              t('shared:proceed_to_setup')
            )}
          </PrimaryButton>
        </Flex>
      }
      selectedRobot={selectedRobot}
      setSelectedRobot={setSelectedRobot}
      robotType={robotType}
      isCreatingRun={isCreatingRun}
      reset={resetCreateRun}
      runCreationError={runCreationError}
      runCreationErrorCode={runCreationErrorCode}
      showIdleOnly={true}
    />
  )
}

export function ChooseRobotToRunProtocolSlideout(
  props: ChooseRobotToRunProtocolSlideoutProps
): JSX.Element | null {
  return <ChooseRobotToRunProtocolSlideoutComponent {...props} />
}
