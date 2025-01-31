import { useState, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  useCreateProtocolAnalysisMutation,
  useCreateRunMutation,
  useHost,
  useUploadCsvFileMutation,
} from '@opentrons/react-api-client'
import { useQueryClient } from 'react-query'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
} from '@opentrons/components'
import {
  formatRunTimeParameterValue,
  sortRuntimeParameters,
} from '@opentrons/shared-data'

import {
  getRunTimeParameterFilesForRun,
  getRunTimeParameterValuesForRun,
} from '/app/transformations/runs'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { ResetValuesModal } from './ResetValuesModal'
import { ChooseEnum } from './ChooseEnum'
import { ChooseNumber } from './ChooseNumber'
import { ChooseCsvFile } from './ChooseCsvFile'
import { useToaster } from '/app/organisms/ToasterOven'
import { ProtocolSetupStep } from '../ProtocolSetupStep'
import type {
  CompletedProtocolAnalysis,
  ChoiceParameter,
  CsvFileParameter,
  NumberParameter,
  RunTimeParameter,
  ValueRunTimeParameter,
  CsvFileParameterFileData,
} from '@opentrons/shared-data'
import type { ProtocolSetupStepStatus } from '../ProtocolSetupStep'
import type {
  FileData,
  LegacyLabwareOffsetCreateData,
} from '@opentrons/api-client'

interface ProtocolSetupParametersProps {
  protocolId: string
  runTimeParameters: RunTimeParameter[]
  labwareOffsets?: LegacyLabwareOffsetCreateData[]
  mostRecentAnalysis?: CompletedProtocolAnalysis | null
}

export function ProtocolSetupParameters({
  protocolId,
  labwareOffsets,
  runTimeParameters,
  mostRecentAnalysis,
}: ProtocolSetupParametersProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const navigate = useNavigate()
  const host = useHost()
  const queryClient = useQueryClient()
  const [
    chooseValueScreen,
    setChooseValueScreen,
  ] = useState<ChoiceParameter | null>(null)
  const [
    showNumericalInputScreen,
    setShowNumericalInputScreen,
  ] = useState<NumberParameter | null>(null)
  const [
    chooseCsvFileScreen,
    setChooseCsvFileScreen,
  ] = useState<CsvFileParameter | null>(null)
  const [resetValuesModal, showResetValuesModal] = useState<boolean>(false)
  const [startSetup, setStartSetup] = useState<boolean>(false)
  const [runTimeParametersOverrides, setRunTimeParametersOverrides] = useState<
    RunTimeParameter[]
  >(
    runTimeParameters.map(parameter =>
      parameter.type === 'csv_file'
        ? { ...parameter, file: null }
        : // TODO (nd: 06/13/2024) create individual ChoiceParameter types for correct narrowing
          // eslint-disable-next-line
          ({ ...parameter, value: parameter.default } as ValueRunTimeParameter)
    )
  )

  const hasMissingFileParam =
    runTimeParametersOverrides?.some((parameter): boolean => {
      if (parameter.type !== 'csv_file') {
        return false
      }

      if (parameter.file == null) {
        return true
      }

      return (
        parameter.file.id == null &&
        parameter.file.file == null &&
        parameter.file.filePath == null
      )
    }) ?? false

  const { makeSnackbar } = useToaster()

  const updateParameters = (
    value: boolean | string | number | CsvFileParameterFileData,
    variableName: string
  ): void => {
    const updatedParameters = runTimeParametersOverrides.map(parameter => {
      if (parameter.variableName === variableName) {
        return parameter.type === 'csv_file'
          ? { ...parameter, file: value }
          : { ...parameter, value }
      }
      return parameter
    })
    setRunTimeParametersOverrides(updatedParameters as RunTimeParameter[])
    if (chooseValueScreen && chooseValueScreen.variableName === variableName) {
      const updatedParameter = updatedParameters.find(
        parameter => parameter.variableName === variableName
      )
      if (updatedParameter != null && 'choices' in updatedParameter) {
        setChooseValueScreen(updatedParameter as ChoiceParameter)
      }
    }
    if (
      showNumericalInputScreen &&
      showNumericalInputScreen.variableName === variableName
    ) {
      const updatedParameter = updatedParameters.find(
        parameter => parameter.variableName === variableName
      )
      if (updatedParameter != null) {
        setShowNumericalInputScreen(updatedParameter as NumberParameter)
      }
    }
    if (
      chooseCsvFileScreen &&
      chooseCsvFileScreen.variableName === variableName
    ) {
      const updatedParameter = updatedParameters.find(
        parameter => parameter.variableName === variableName
      )
      if (updatedParameter != null && updatedParameter.type === 'csv_file') {
        setChooseCsvFileScreen(updatedParameter as CsvFileParameter)
      }
    }
  }

  const {
    createProtocolAnalysis,
    isLoading: isAnalysisLoading,
  } = useCreateProtocolAnalysisMutation(protocolId, host)

  const { uploadCsvFile } = useUploadCsvFileMutation({}, host)

  const { createRun, isLoading: isRunLoading } = useCreateRunMutation({
    onSuccess: data => {
      queryClient.invalidateQueries([host, 'runs']).catch((e: Error) => {
        console.error(`could not invalidate runs cache: ${e.message}`)
      })
    },
  })
  const handleConfirmValues = (): void => {
    if (hasMissingFileParam) {
      makeSnackbar(t('protocol_requires_csv') as string)
    } else {
      const dataFilesForProtocolMap = runTimeParametersOverrides.reduce<
        Record<string, FileData>
      >((acc, parameter) => {
        // create {variableName: FileData} map for sending to /dataFiles endpoint
        if (
          parameter.type === 'csv_file' &&
          parameter.file?.id == null &&
          parameter.file?.file != null
        ) {
          return { [parameter.variableName]: parameter.file.file }
        } else if (
          parameter.type === 'csv_file' &&
          parameter.file?.id == null &&
          parameter.file?.filePath != null
        ) {
          return { [parameter.variableName]: parameter.file.filePath }
        }
        return acc
      }, {})
      void Promise.all(
        Object.entries(dataFilesForProtocolMap).map(([key, fileData]) => {
          const fileResponse = uploadCsvFile(fileData)
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
        setStartSetup(true)
        createProtocolAnalysis(
          {
            protocolKey: protocolId,
            runTimeParameterValues,
            runTimeParameterFiles,
          },
          {
            onSuccess: () => {
              createRun({
                protocolId,
                labwareOffsets,
                runTimeParameterValues,
                runTimeParameterFiles,
              })
            },
          }
        )
      })
    }
  }

  const handleSetParameter = (parameter: RunTimeParameter): void => {
    if ('choices' in parameter) {
      setChooseValueScreen(parameter)
    } else if (parameter.type === 'bool') {
      updateParameters(!parameter.value, parameter.variableName)
    } else if (parameter.type === 'int' || parameter.type === 'float') {
      setShowNumericalInputScreen(parameter)
    } else if (parameter.type === 'csv_file') {
      setChooseCsvFileScreen(parameter)
    } else {
      // bad param
      console.error('error: bad param. not expected to reach this')
    }
  }

  let children = (
    <>
      <ChildNavigation
        header={t('parameters')}
        onClickBack={() => {
          navigate(-1)
        }}
        onClickButton={handleConfirmValues}
        buttonText={t('confirm_values')}
        ariaDisabled={hasMissingFileParam}
        buttonIsDisabled={hasMissingFileParam}
        iconName={
          isRunLoading || isAnalysisLoading || startSetup
            ? 'ot-spinner'
            : undefined
        }
        iconPlacement="startIcon"
        secondaryButtonProps={{
          buttonType: 'tertiaryLowLight',
          buttonText: t('restore_defaults'),
          disabled: isRunLoading || isAnalysisLoading || startSetup,
          onClick: () => {
            showResetValuesModal(true)
          },
        }}
      />
      <Flex
        marginTop="7.75rem"
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
        paddingX={SPACING.spacing40}
        paddingBottom={SPACING.spacing40}
      >
        {sortRuntimeParameters(runTimeParametersOverrides).map(
          (parameter, index) => {
            let detail: string = ''
            let setupStatus: ProtocolSetupStepStatus
            if (parameter.type === 'csv_file') {
              if (parameter.file?.fileName == null) {
                detail = t('required')
                setupStatus = 'not ready'
              } else {
                detail = parameter.file.fileName
                setupStatus = 'ready'
              }
            } else {
              detail = formatRunTimeParameterValue(parameter, t)
              setupStatus = 'inform'
            }
            return (
              <Fragment key={`${parameter.displayName}_${index}`}>
                <ProtocolSetupStep
                  hasRightIcon={!(parameter.type === 'bool')}
                  hasLeftIcon={false}
                  status={setupStatus}
                  title={
                    parameter.type === 'csv_file'
                      ? t('csv_file')
                      : parameter.displayName
                  }
                  onClickSetupStep={() => {
                    handleSetParameter(parameter)
                  }}
                  detail={detail}
                  description={
                    parameter.type === 'csv_file' ? null : parameter.description
                  }
                  fontSize="h4"
                  disabled={startSetup}
                />
              </Fragment>
            )
          }
        )}
      </Flex>
    </>
  )

  if (chooseCsvFileScreen != null) {
    children = (
      <ChooseCsvFile
        protocolId={protocolId}
        handleGoBack={() => {
          setChooseCsvFileScreen(null)
        }}
        parameter={chooseCsvFileScreen}
        setParameter={updateParameters}
      />
    )
  }
  if (chooseValueScreen != null) {
    children = (
      <ChooseEnum
        handleGoBack={() => {
          setChooseValueScreen(null)
        }}
        parameter={chooseValueScreen}
        setParameter={updateParameters}
        rawValue={chooseValueScreen.value}
      />
    )
  }
  if (showNumericalInputScreen != null) {
    children = (
      <ChooseNumber
        handleGoBack={() => {
          setShowNumericalInputScreen(null)
        }}
        parameter={showNumericalInputScreen}
        setParameter={updateParameters}
      />
    )
  }

  return (
    <>
      {resetValuesModal ? (
        <ResetValuesModal
          runTimeParametersOverrides={runTimeParametersOverrides}
          setRunTimeParametersOverrides={setRunTimeParametersOverrides}
          handleGoBack={() => {
            showResetValuesModal(false)
          }}
        />
      ) : null}
      {children}
    </>
  )
}
