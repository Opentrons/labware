import { Fragment, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { format } from 'date-fns'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  EndUserAgreementFooter,
  Flex,
  JUSTIFY_FLEX_END,
  JUSTIFY_SPACE_BETWEEN,
  LargeButton,
  NO_WRAP,
  SPACING,
  StyledText,
  WRAP,
} from '@opentrons/components'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  getAdditionalEquipmentEntities,
  getInitialDeckSetup,
} from '../../step-forms/selectors'
import { selectors as fileSelectors } from '../../file-data'
import { selectors as stepFormSelectors } from '../../step-forms'
import { actions as loadFileActions } from '../../load-file'
import { getEnableTimelineScrubber } from '../../feature-flags/selectors'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { MaterialsListModal } from '../../organisms/MaterialsListModal'
import { LINE_CLAMP_TEXT_STYLE, COLUMN_STYLE } from '../../atoms'
import { useBlockingHint } from '../../organisms/BlockingHintModal/useBlockingHint'
import {
  EditProtocolMetadataModal,
  EditInstrumentsModal,
} from '../../organisms'
import { getWarningContent } from './UnusedModalContent'
import { ProtocolMetadata } from './ProtocolMetadata'
import { InstrumentsInfo } from './InstrumentsInfo'
import { LiquidDefinitions } from './LiquidDefinitions'
import { StepsInfo } from './StepsInfo'
import { StartingDeck } from './StartingDeck'
import {
  getUnusedEntities,
  getUnusedStagingAreas,
  getUnusedTrash,
} from './utils'
import { ScrubberContainer } from './ScrubberContainer'
import type { CreateCommand } from '@opentrons/shared-data'
import type { ThunkDispatch } from '../../types'

const DATE_ONLY_FORMAT = 'MMMM dd, yyyy'
const DATETIME_FORMAT = 'MMMM dd, yyyy | h:mm a'

const LOAD_COMMANDS: Array<CreateCommand['commandType']> = [
  'loadLabware',
  'loadModule',
  'loadPipette',
  'loadLiquid',
]

export interface Fixture {
  trashBin: boolean
  wasteChute: boolean
  stagingAreaSlots: string[]
}

export function ProtocolOverview(): JSX.Element {
  const { t } = useTranslation([
    'protocol_overview',
    'alert',
    'shared',
    'starting_deck_State',
    'modules',
  ])
  const navigate = useNavigate()
  const [
    showEditInstrumentsModal,
    setShowEditInstrumentsModal,
  ] = useState<boolean>(false)
  const enableTimelineScrubber = useSelector(getEnableTimelineScrubber)
  const [showEditMetadataModal, setShowEditMetadataModal] = useState<boolean>(
    false
  )
  const [showExportWarningModal, setShowExportWarningModal] = useState<boolean>(
    false
  )
  const formValues = useSelector(fileSelectors.getFileMetadata)
  const robotType = useSelector(fileSelectors.getRobotType)
  const initialDeckSetup = useSelector(getInitialDeckSetup)
  const allIngredientGroupFields = useSelector(
    labwareIngredSelectors.allIngredientGroupFields
  )
  const dispatch: ThunkDispatch<any> = useDispatch()
  const [showMaterialsListModal, setShowMaterialsListModal] = useState<boolean>(
    false
  )
  const fileData = useSelector(fileSelectors.createFile)
  const savedStepForms = useSelector(stepFormSelectors.getSavedStepForms)
  const additionalEquipment = useSelector(getAdditionalEquipmentEntities)
  const liquidsOnDeck = useSelector(
    labwareIngredSelectors.allIngredientNamesIds
  )

  useEffect(() => {
    if (formValues?.created == null) {
      console.log(
        'formValues was possibly refreshed while on the overview page, redirecting to landing page'
      )
      navigate('/')
    }
  }, [formValues])

  const {
    modules: modulesOnDeck,
    labware: labwaresOnDeck,
    additionalEquipmentOnDeck,
    pipettes,
  } = initialDeckSetup

  const nonLoadCommands =
    fileData?.commands.filter(
      command => !LOAD_COMMANDS.includes(command.commandType)
    ) ?? []
  const gripperInUse =
    fileData?.commands.find(
      command =>
        (command.commandType === 'moveLabware' &&
          command.params.strategy === 'usingGripper') ||
        command.commandType === 'absorbanceReader/closeLid' ||
        command.commandType === 'absorbanceReader/openLid'
    ) != null
  const noCommands = fileData != null ? nonLoadCommands.length === 0 : true
  const modulesWithoutStep = getUnusedEntities(
    modulesOnDeck,
    savedStepForms,
    'moduleId',
    robotType
  )
  const pipettesWithoutStep = getUnusedEntities(
    initialDeckSetup.pipettes,
    savedStepForms,
    'pipette',
    robotType
  )
  const isGripperAttached = Object.values(additionalEquipment).some(
    equipment => equipment?.name === 'gripper'
  )
  const gripperWithoutStep = isGripperAttached && !gripperInUse

  const { trashBinUnused, wasteChuteUnused } = getUnusedTrash(
    additionalEquipmentOnDeck,
    fileData?.commands
  )
  const fixtureWithoutStep: Fixture = {
    trashBin: trashBinUnused,
    wasteChute: wasteChuteUnused,
    stagingAreaSlots: getUnusedStagingAreas(
      additionalEquipmentOnDeck,
      fileData?.commands
    ),
  }

  const pipettesOnDeck = Object.values(pipettes)
  const {
    protocolName,
    description,
    created,
    lastModified,
    author,
  } = formValues
  const metaDataInfo = [
    { description },
    { author },
    { created: created != null ? format(created, DATE_ONLY_FORMAT) : t('na') },
    {
      modified:
        lastModified != null ? format(lastModified, DATETIME_FORMAT) : t('na'),
    },
  ]

  const hasWarning =
    noCommands ||
    modulesWithoutStep.length > 0 ||
    pipettesWithoutStep.length > 0 ||
    gripperWithoutStep ||
    fixtureWithoutStep.trashBin ||
    fixtureWithoutStep.wasteChute ||
    fixtureWithoutStep.stagingAreaSlots.length > 0

  const warning = hasWarning
    ? getWarningContent({
        noCommands,
        pipettesWithoutStep,
        modulesWithoutStep,
        gripperWithoutStep,
        fixtureWithoutStep,
        t,
      })
    : null

  const exportWarningModal = useBlockingHint({
    hintKey: warning?.hintKey ?? null,
    enabled: showExportWarningModal,
    content: warning?.content,
    handleCancel: () => {
      setShowExportWarningModal(false)
    },
    handleContinue: () => {
      setShowExportWarningModal(false)
      dispatch(loadFileActions.saveProtocolFile())
    },
  })

  return (
    <Fragment>
      {showEditMetadataModal ? (
        <EditProtocolMetadataModal
          onClose={() => {
            setShowEditMetadataModal(false)
          }}
        />
      ) : null}
      {showEditInstrumentsModal ? (
        <EditInstrumentsModal
          onClose={() => {
            setShowEditInstrumentsModal(false)
          }}
        />
      ) : null}
      {exportWarningModal}
      {showMaterialsListModal ? (
        <MaterialsListModal
          hardware={Object.values(modulesOnDeck)}
          fixtures={
            robotType === OT2_ROBOT_TYPE
              ? Object.values(additionalEquipmentOnDeck)
              : []
          }
          labware={Object.values(labwaresOnDeck)}
          liquids={liquidsOnDeck}
          setShowMaterialsListModal={setShowMaterialsListModal}
        />
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={`${SPACING.spacing60} ${SPACING.spacing80}`}
        gridGap={SPACING.spacing60}
        width="100%"
      >
        <Flex
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing60}
        >
          <Flex flex="1">
            <StyledText
              desktopStyle="displayBold"
              css={LINE_CLAMP_TEXT_STYLE(3)}
            >
              {protocolName != null && protocolName !== ''
                ? protocolName
                : t('untitled_protocol')}
            </StyledText>
          </Flex>

          <Flex
            gridGap={SPACING.spacing8}
            flex="1"
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_FLEX_END}
          >
            <LargeButton
              buttonType="stroke"
              buttonText={t('edit_protocol')}
              onClick={() => {
                navigate('/designer')
              }}
              whiteSpace={NO_WRAP}
              height="3.5rem"
              // ToDo (kk:2024/11/07 this will be updated in the future)
              css={css`
                border: 2px solid ${COLORS.blue50};
              `}
            />
            <LargeButton
              buttonText={t('export_protocol')}
              onClick={() => {
                setShowExportWarningModal(true)
              }}
              iconName="arrow-right"
              whiteSpace={NO_WRAP}
              height="3.5rem"
            />
          </Flex>
        </Flex>
        <Flex gridGap={SPACING.spacing80} flexWrap={WRAP}>
          <Flex
            flex="1.27"
            flexDirection={DIRECTION_COLUMN}
            css={COLUMN_STYLE}
            gridGap={SPACING.spacing40}
          >
            <ProtocolMetadata
              metaDataInfo={metaDataInfo}
              setShowEditMetadataModal={setShowEditMetadataModal}
            />
            <InstrumentsInfo
              robotType={robotType}
              pipettesOnDeck={pipettesOnDeck}
              additionalEquipment={additionalEquipment}
              setShowEditInstrumentsModal={setShowEditInstrumentsModal}
            />
            <LiquidDefinitions
              allIngredientGroupFields={allIngredientGroupFields}
            />
            <StepsInfo savedStepForms={savedStepForms} />
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            css={COLUMN_STYLE}
            gridGap={SPACING.spacing12}
          >
            {enableTimelineScrubber ? <ScrubberContainer /> : null}
            <StartingDeck
              robotType={robotType}
              setShowMaterialsListModal={setShowMaterialsListModal}
            />
          </Flex>
        </Flex>
      </Flex>
      <EndUserAgreementFooter />
    </Fragment>
  )
}
