import { useState } from 'react'
import first from 'lodash/first'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  NO_WRAP,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import {
  useUploadCsvFileMutation,
  ApiHostProvider,
} from '@opentrons/react-api-client'

import { useIsRobotOnWrongVersionOfSoftware } from '/app/redux/robot-update'
import { OPENTRONS_USB } from '/app/redux/discovery'
import { appShellRequestor } from '/app/redux/shell/remote'
import { useTrackCreateProtocolRunEvent } from '/app/organisms/Desktop/Devices/hooks'
import {
  getRunTimeParameterFilesForRun,
  getRunTimeParameterValuesForRun,
} from '/app/transformations/runs'
import { LegacyApplyHistoricOffsets } from '/app/organisms/LegacyApplyHistoricOffsets'
import { useOffsetCandidatesForAnalysis } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/useOffsetCandidatesForAnalysis'
import { ChooseRobotSlideout } from '../ChooseRobotSlideout'
import { useCreateRunFromProtocol } from './useCreateRunFromProtocol'
import { useFeatureFlag } from '/app/redux/config'

import type { MouseEventHandler } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { RunTimeParameter } from '@opentrons/shared-data'
import type { Robot } from '/app/redux/discovery/types'
import type { StoredProtocolData } from '/app/redux/protocol-storage'

const _getFileBaseName = (filePath: string): string => {
  return filePath.split('/').reverse()[0]
}
interface ChooseRobotToRunProtocolSlideoutProps extends StyleProps {
  storedProtocolData: StoredProtocolData
  onCloseClick: () => void
  showSlideout: boolean
}

interface ChooseRobotToRunProtocolSlideoutComponentProps
  extends ChooseRobotToRunProtocolSlideoutProps {
  selectedRobot: Robot | null
  setSelectedRobot: (robot: Robot | null) => void
}

export function ChooseRobotToRunProtocolSlideoutComponent(
  props: ChooseRobotToRunProtocolSlideoutComponentProps
): JSX.Element | null {
  const { t } = useTranslation(['protocol_details', 'shared', 'app_settings'])
  const {
    storedProtocolData,
    showSlideout,
    onCloseClick,
    selectedRobot,
    setSelectedRobot,
  } = props
  const navigate = useNavigate()
  const isNewLpc = useFeatureFlag('lpcRedesign')
  const [shouldApplyOffsets, setShouldApplyOffsets] = useState<boolean>(true)
  const {
    protocolKey,
    srcFileNames,
    srcFiles,
    mostRecentAnalysis,
  } = storedProtocolData
  const [currentPage, setCurrentPage] = useState<number>(1)
  const { trackCreateProtocolRunEvent } = useTrackCreateProtocolRunEvent(
    storedProtocolData,
    selectedRobot?.name ?? ''
  )
  const runTimeParameters =
    storedProtocolData.mostRecentAnalysis?.runTimeParameters ?? []

  const [runTimeParametersOverrides, setRunTimeParametersOverrides] = useState<
    RunTimeParameter[]
  >(runTimeParameters)
  const [hasParamError, setHasParamError] = useState<boolean>(false)
  const [hasMissingFileParam, setHasMissingFileParam] = useState<boolean>(
    runTimeParameters?.some(parameter => parameter.type === 'csv_file') ?? false
  )

  const [targetProps, tooltipProps] = useHoverTooltip()

  const offsetCandidates = useOffsetCandidatesForAnalysis(
    mostRecentAnalysis,
    null
  )

  const { uploadCsvFile } = useUploadCsvFileMutation()

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
          navigate(`/devices/${selectedRobot.name}/protocol-runs/${runData.id}`)
        }
      },
      onError: (error: Error) => {
        trackCreateProtocolRunEvent({
          name: 'createProtocolRecordResponse',
          properties: { success: false, error: error.message },
        })
      },
    },
    null,
    shouldApplyOffsets
      ? offsetCandidates.map(({ vector, location, definitionUri }) => ({
          vector,
          location,
          definitionUri,
        }))
      : []
  )
  const handleProceed: MouseEventHandler<HTMLButtonElement> = () => {
    trackCreateProtocolRunEvent({ name: 'createProtocolRecordRequest' })
    const dataFilesForProtocolMap = runTimeParametersOverrides.reduce<
      Record<string, File>
    >(
      (acc, parameter) =>
        parameter.type === 'csv_file' && parameter.file?.file != null
          ? { ...acc, [parameter.variableName]: parameter.file.file }
          : acc,
      {}
    )
    void Promise.all(
      Object.entries(dataFilesForProtocolMap).map(([key, file]) => {
        const fileResponse = uploadCsvFile(file)
        const varName = Promise.resolve(key)
        return Promise.all([fileResponse, varName])
      })
    ).then(responseTuples => {
      const mappedResolvedCsvVariableToFileId = responseTuples.reduce<
        Record<string, string>
      >((acc, [uploadedFileResponse, variableName]) => {
        return { ...acc, [variableName]: uploadedFileResponse.data.id }
      }, {})
      const runTimeParameterValues = getRunTimeParameterValuesForRun(
        runTimeParametersOverrides
      )
      const runTimeParameterFiles = getRunTimeParameterFilesForRun(
        runTimeParametersOverrides,
        mappedResolvedCsvVariableToFileId
      )
      createRunFromProtocolSource({
        files: srcFileObjects,
        protocolKey,
        runTimeParameterValues,
        runTimeParameterFiles,
      })
    })
  }

  const isSelectedRobotOnDifferentSoftwareVersion = useIsRobotOnWrongVersionOfSoftware(
    selectedRobot?.name ?? ''
  )

  const hasRunTimeParameters = runTimeParameters.length > 0

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
    return new File([srcFileBuffer], _getFileBaseName(srcFilePath))
  })
  const protocolDisplayName =
    mostRecentAnalysis?.metadata?.protocolName ??
    first(srcFileNames) ??
    protocolKey

  // intentionally show both robot types if analysis fails
  const robotType =
    mostRecentAnalysis != null && mostRecentAnalysis.result !== 'not-ok'
      ? mostRecentAnalysis?.robotType ?? null
      : null

  const singlePageButton = (
    <PrimaryButton
      disabled={
        isCreatingRun ||
        selectedRobot == null ||
        isSelectedRobotOnDifferentSoftwareVersion
      }
      width="100%"
      onClick={handleProceed}
    >
      {isCreatingRun ? (
        <Icon name="ot-spinner" spin size="1rem" />
      ) : (
        t('shared:proceed_to_setup')
      )}
    </PrimaryButton>
  )

  const offsetsComponent = isNewLpc ? null : (
    <LegacyApplyHistoricOffsets
      offsetCandidates={offsetCandidates}
      shouldApplyOffsets={shouldApplyOffsets}
      setShouldApplyOffsets={setShouldApplyOffsets}
      commands={mostRecentAnalysis?.commands ?? []}
      labware={mostRecentAnalysis?.labware ?? []}
      modules={mostRecentAnalysis?.modules ?? []}
    />
  )

  const footer = (
    <Flex flexDirection={DIRECTION_COLUMN}>
      {hasRunTimeParameters ? (
        currentPage === 1 ? (
          <>
            {offsetsComponent}
            <PrimaryButton
              onClick={() => {
                setCurrentPage(2)
              }}
              width="100%"
              disabled={
                isCreatingRun ||
                selectedRobot == null ||
                isSelectedRobotOnDifferentSoftwareVersion
              }
            >
              {t('shared:continue_to_param')}
            </PrimaryButton>
          </>
        ) : (
          <Flex
            gridGap={SPACING.spacing8}
            flexDirection={DIRECTION_ROW}
            whiteSpace={NO_WRAP}
          >
            <SecondaryButton
              onClick={() => {
                setCurrentPage(1)
              }}
              width="50%"
            >
              {t('shared:change_robot')}
            </SecondaryButton>
            <PrimaryButton
              width="50%"
              onClick={handleProceed}
              disabled={hasParamError || hasMissingFileParam}
              {...targetProps}
            >
              {isCreatingRun ? (
                <Flex
                  gridGap={SPACING.spacing4}
                  alignItems={ALIGN_CENTER}
                  whiteSpace={NO_WRAP}
                  marginLeft={`-${SPACING.spacing4}`}
                >
                  <Icon name="ot-spinner" spin size="1rem" />
                  {t('shared:confirm_values')}
                </Flex>
              ) : (
                t('shared:confirm_values')
              )}
            </PrimaryButton>
            {hasMissingFileParam ? (
              <Tooltip tooltipProps={tooltipProps}>
                {t('add_required_csv_file')}
              </Tooltip>
            ) : null}
          </Flex>
        )
      ) : (
        <>
          {offsetsComponent}
          {singlePageButton}
        </>
      )}
    </Flex>
  )

  const resetRunTimeParameters = (): void => {
    const clone = runTimeParametersOverrides.map(parameter =>
      parameter.type === 'csv_file'
        ? { ...parameter, file: null }
        : { ...parameter, value: parameter.default }
    )
    setRunTimeParametersOverrides(clone as RunTimeParameter[])
  }

  return (
    <ChooseRobotSlideout
      multiSlideout={hasRunTimeParameters ? { currentPage } : null}
      isExpanded={showSlideout}
      isSelectedRobotOnDifferentSoftwareVersion={
        isSelectedRobotOnDifferentSoftwareVersion
      }
      onCloseClick={() => {
        onCloseClick()
        resetRunTimeParameters()
        setCurrentPage(1)
        setSelectedRobot(null)
      }}
      title={
        hasRunTimeParameters && currentPage === 2
          ? t('select_parameters_for_robot', {
              robot_name: selectedRobot?.name,
            })
          : t('choose_robot_to_run', {
              protocol_name: protocolDisplayName,
            })
      }
      runTimeParametersOverrides={runTimeParametersOverrides}
      setRunTimeParametersOverrides={setRunTimeParametersOverrides}
      footer={footer}
      selectedRobot={selectedRobot}
      setSelectedRobot={setSelectedRobot}
      robotType={robotType}
      isCreatingRun={isCreatingRun}
      reset={resetCreateRun}
      runCreationError={runCreationError}
      runCreationErrorCode={runCreationErrorCode}
      showIdleOnly
      setHasParamError={setHasParamError}
      resetRunTimeParameters={resetRunTimeParameters}
      setHasMissingFileParam={setHasMissingFileParam}
    />
  )
}

export function ChooseRobotToRunProtocolSlideout(
  props: ChooseRobotToRunProtocolSlideoutProps
): JSX.Element | null {
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null)
  return (
    <ApiHostProvider
      hostname={selectedRobot?.ip ?? null}
      port={selectedRobot?.port ?? null}
      requestor={
        selectedRobot?.ip === OPENTRONS_USB ? appShellRequestor : undefined
      }
    >
      <ChooseRobotToRunProtocolSlideoutComponent
        {...{ ...props, selectedRobot, setSelectedRobot }}
      />
    </ApiHostProvider>
  )
}
