import { useState, Fragment } from 'react'
import { createPortal } from 'react-dom'
import map from 'lodash/map'
import omit from 'lodash/omit'
import isEmpty from 'lodash/isEmpty'
import startCase from 'lodash/startCase'
import { format } from 'date-fns'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { ErrorBoundary } from 'react-error-boundary'

import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  DISPLAY_GRID,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  Link,
  Modal,
  OVERFLOW_WRAP_ANYWHERE,
  POSITION_RELATIVE,
  PrimaryButton,
  ProtocolDeck,
  SIZE_1,
  SIZE_5,
  SPACING,
  Tabs,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  MAGNETIC_BLOCK_TYPE,
  getGripperDisplayName,
  getModuleType,
  getSimplestDeckConfigForProtocol,
  parseInitialLoadedModulesBySlot,
  parseInitialPipetteNamesByMount,
} from '@opentrons/shared-data'

import { getTopPortalEl } from '/app/App/portal'
import { Divider } from '/app/atoms/structure'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
} from '/app/redux/analytics'
import {
  getIsProtocolAnalysisInProgress,
  analyzeProtocol,
} from '/app/redux/protocol-storage'
import { useFeatureFlag } from '/app/redux/config'
import { ChooseRobotToRunProtocolSlideout } from '/app/organisms/Desktop/ChooseRobotToRunProtocolSlideout'
import { SendProtocolToFlexSlideout } from '../SendProtocolToFlexSlideout'
import { ProtocolAnalysisFailure } from '../ProtocolAnalysisFailure'
import { ProtocolStatusBanner } from '../ProtocolStatusBanner'
import { getAnalysisStatus } from '/app/transformations/analysis'
import { getProtocolDisplayName } from '/app/transformations/protocols'
import { getProtocolUsesGripper } from '/app/transformations/commands'
import { ProtocolOverflowMenu } from '../ProtocolsLanding/ProtocolOverflowMenu'
import { ProtocolStats } from './ProtocolStats'
import { ProtocolLabwareDetails } from './ProtocolLabwareDetails'
import { ProtocolLiquidsDetails } from './ProtocolLiquidsDetails'
import { RobotConfigurationDetails } from './RobotConfigurationDetails'
import { ProtocolParameters } from './ProtocolParameters'
import { AnnotatedSteps } from './AnnotatedSteps'

import type {
  JsonConfig,
  PythonConfig,
  LoadLabwareRunTimeCommand,
} from '@opentrons/shared-data'
import type {
  GroupedCommands,
  StoredProtocolData,
} from '/app/redux/protocol-storage'
import type { State, Dispatch } from '/app/redux/types'

const GRID_STYLE = css`
  display: ${DISPLAY_GRID};
  width: 100%;
  grid-template-columns: 26.6% 26.6% 26.6% 20.2%;
`

const TWO_COL_GRID_STYLE = css`
  display: ${DISPLAY_GRID};
  grid-gap: ${SPACING.spacing24};
  grid-template-columns: 22.5% 77.5%;
`

const ZOOM_ICON_STYLE = css`
  border-radius: ${BORDERS.borderRadius4};
  &:hover {
    background: ${COLORS.grey30};
  }
  &:active {
    background: ${COLORS.grey35};
  }
  &:disabled {
    background: ${COLORS.white};
  }
  &:focus-visible {
    background: ${COLORS.grey35};
  }
`

interface Metadata {
  [key: string]: any
}

interface MetadataDetailsProps {
  description: string
  metadata: Metadata
  protocolType: string
}

function MetadataDetails({
  description,
  metadata,
  protocolType,
}: MetadataDetailsProps): JSX.Element {
  if (protocolType === 'json') {
    return <LegacyStyledText as="p">{description}</LegacyStyledText>
  } else {
    const filteredMetaData = Object.entries(
      omit(metadata, ['description', 'protocolName', 'author', 'apiLevel'])
    ).map(item => ({ label: item[0], value: item[1] }))

    return (
      <Flex
        flex="1"
        flexDirection={DIRECTION_COLUMN}
        data-testid="ProtocolDetails_description"
      >
        <LegacyStyledText as="p" overflowWrap={OVERFLOW_WRAP_ANYWHERE}>
          {description}
        </LegacyStyledText>
        {filteredMetaData.map((item, index) => {
          return (
            <Fragment key={index}>
              <LegacyStyledText
                as="h6"
                marginTop={SPACING.spacing8}
                color={COLORS.grey60}
              >
                {startCase(item.label)}
              </LegacyStyledText>
              <LegacyStyledText as="p">{item.value}</LegacyStyledText>
            </Fragment>
          )
        })}
      </Flex>
    )
  }
}

interface ReadMoreContentProps {
  metadata: Metadata
  protocolType: 'json' | 'python'
}

const ReadMoreContent = (props: ReadMoreContentProps): JSX.Element => {
  const { metadata, protocolType } = props
  const { t, i18n } = useTranslation('protocol_details')
  const [isReadMore, setIsReadMore] = useState(true)

  const description = isEmpty(metadata.description)
    ? t('shared:no_data')
    : metadata.description

  return (
    <Flex flexDirection={DIRECTION_COLUMN} paddingRight={SPACING.spacing16}>
      {isReadMore ? (
        <LegacyStyledText as="p" overflowWrap={OVERFLOW_WRAP_ANYWHERE}>
          {description.slice(0, 160)}
        </LegacyStyledText>
      ) : (
        <MetadataDetails
          description={description}
          metadata={metadata}
          protocolType={protocolType}
        />
      )}
      {(description.length > 160 || protocolType === 'python') && (
        <Link
          role="button"
          css={TYPOGRAPHY.linkPSemiBold}
          marginTop={SPACING.spacing8}
          onClick={() => {
            setIsReadMore(!isReadMore)
          }}
        >
          {isReadMore
            ? i18n.format(t('read_more'), 'capitalize')
            : i18n.format(t('read_less'), 'capitalize')}
        </Link>
      )}
    </Flex>
  )
}

interface ProtocolDetailsProps extends StoredProtocolData {
  groupedCommands: GroupedCommands | null
}

export function ProtocolDetails(
  props: ProtocolDetailsProps
): JSX.Element | null {
  const trackEvent = useTrackEvent()
  const dispatch = useDispatch<Dispatch>()
  const {
    protocolKey,
    srcFileNames,
    mostRecentAnalysis,
    modified,
    groupedCommands,
  } = props
  const { t, i18n } = useTranslation(['protocol_details', 'shared'])
  const enableProtocolStats = useFeatureFlag('protocolStats')
  const enableProtocolTimeline = useFeatureFlag('protocolTimeline')
  const runTimeParameters = mostRecentAnalysis?.runTimeParameters ?? []
  const hasRunTimeParameters = runTimeParameters.length > 0
  const [currentTab, setCurrentTab] = useState<
    'robot_config' | 'labware' | 'liquids' | 'stats' | 'parameters' | 'timeline'
  >(hasRunTimeParameters ? 'parameters' : 'robot_config')
  const [
    showChooseRobotToRunProtocolSlideout,
    setShowChooseRobotToRunProtocolSlideout,
  ] = useState<boolean>(false)
  const [
    showSendProtocolToFlexSlideout,
    setShowSendProtocolToFlexSlideout,
  ] = useState<boolean>(false)
  const [showDeckViewModal, setShowDeckViewModal] = useState(false)

  const isAnalyzing = useSelector((state: State) =>
    getIsProtocolAnalysisInProgress(state, protocolKey)
  )

  const analysisStatus = getAnalysisStatus(isAnalyzing, mostRecentAnalysis)

  if (analysisStatus === 'stale') {
    dispatch(analyzeProtocol(protocolKey))
  } else if (analysisStatus === 'missing') return null

  const { left: leftMountPipetteName, right: rightMountPipetteName } =
    mostRecentAnalysis != null
      ? parseInitialPipetteNamesByMount(mostRecentAnalysis.commands)
      : { left: null, right: null }

  const requiredExtensionInstrumentName =
    mostRecentAnalysis != null && getProtocolUsesGripper(mostRecentAnalysis)
      ? getGripperDisplayName('gripperV1')
      : null

  const requiredModuleDetails =
    mostRecentAnalysis?.commands != null
      ? map(
          parseInitialLoadedModulesBySlot(mostRecentAnalysis.commands)
        ).filter(
          loadedModule =>
            // filter out magnetic block which is already handled by the required fixture details
            getModuleType(loadedModule.params.model) !== MAGNETIC_BLOCK_TYPE
        )
      : []

  const requiredFixtureDetails = getSimplestDeckConfigForProtocol(
    analysisStatus !== 'stale' && analysisStatus !== 'loading'
      ? mostRecentAnalysis
      : null
  )

  const loadLabwareCommands =
    mostRecentAnalysis?.commands.filter(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware' &&
        command.result?.definition.parameters.format !== 'trash'
    ) ?? []

  const protocolDisplayName = getProtocolDisplayName(
    protocolKey,
    srcFileNames,
    mostRecentAnalysis
  )

  const getCreationMethod = (config: JsonConfig | PythonConfig): string => {
    if (config.protocolType === 'json') {
      return t('protocol_designer_version', {
        version: config.schemaVersion.toFixed(1),
      })
    } else {
      return t('python_api_version', {
        version:
          config.apiVersion != null ? config.apiVersion?.join('.') : null,
      })
    }
  }

  const creationMethod =
    mostRecentAnalysis != null
      ? getCreationMethod(mostRecentAnalysis.config) ?? t('shared:no_data')
      : t('shared:no_data')
  const author =
    mostRecentAnalysis != null
      ? mostRecentAnalysis?.metadata?.author ?? t('shared:no_data')
      : t('shared:no_data')
  const lastAnalyzed =
    mostRecentAnalysis?.createdAt != null
      ? format(new Date(mostRecentAnalysis.createdAt), 'M/d/yy HH:mm')
      : t('shared:no_data')
  const robotType = mostRecentAnalysis?.robotType ?? null

  const contentsByTabName = {
    labware: (
      <ProtocolLabwareDetails requiredLabwareDetails={loadLabwareCommands} />
    ),
    robot_config: (
      <RobotConfigurationDetails
        leftMountPipetteName={leftMountPipetteName}
        rightMountPipetteName={rightMountPipetteName}
        extensionInstrumentName={requiredExtensionInstrumentName}
        requiredModuleDetails={requiredModuleDetails}
        requiredFixtureDetails={requiredFixtureDetails}
        isLoading={analysisStatus === 'loading'}
        robotType={robotType}
      />
    ),
    liquids: (
      <ProtocolLiquidsDetails
        commands={
          mostRecentAnalysis?.commands != null
            ? mostRecentAnalysis?.commands
            : []
        }
        liquids={
          mostRecentAnalysis?.liquids != null ? mostRecentAnalysis?.liquids : []
        }
      />
    ),
    stats: enableProtocolStats ? (
      <ProtocolStats analysis={mostRecentAnalysis} />
    ) : null,
    timeline:
      enableProtocolTimeline && mostRecentAnalysis != null ? (
        <AnnotatedSteps
          analysis={mostRecentAnalysis}
          groupedCommands={groupedCommands}
        />
      ) : null,
    parameters: <ProtocolParameters runTimeParameters={runTimeParameters} />,
  }

  const deckMap = <ProtocolDeck protocolAnalysis={mostRecentAnalysis} />

  const deckViewByAnalysisStatus = {
    stale: <Box size="14rem" backgroundColor={COLORS.grey30} />,
    missing: <Box size="14rem" backgroundColor={COLORS.grey30} />,
    loading: <Box size="14rem" backgroundColor={COLORS.grey30} />,
    error: <Box size="14rem" backgroundColor={COLORS.grey30} />,
    parameterRequired: <Box size="14rem" backgroundColor={COLORS.grey30} />,
    complete: (
      <Box size="14rem" height="auto">
        {deckMap}
      </Box>
    ),
  }

  const handleRunProtocolButtonClick = (): void => {
    trackEvent({
      name: ANALYTICS_PROTOCOL_PROCEED_TO_RUN,
      properties: { sourceLocation: 'ProtocolsDetail' },
    })
    setShowChooseRobotToRunProtocolSlideout(true)
  }

  const UNKNOWN_ATTACHMENT_ERROR = `${protocolDisplayName} protocol uses
  instruments or modules from a future version of Opentrons software. Please update
  the app to the most recent version to run this protocol.`

  const UnknownAttachmentError = (
    <ProtocolAnalysisFailure
      protocolKey={protocolKey}
      errors={[UNKNOWN_ATTACHMENT_ERROR]}
    />
  )

  return (
    <>
      {showDeckViewModal
        ? createPortal(
            <Modal
              title={t('deck_view')}
              onClose={() => {
                setShowDeckViewModal(false)
              }}
            >
              {deckMap}
            </Modal>,
            getTopPortalEl()
          )
        : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing16}
        width="100%"
      >
        <ErrorBoundary fallback={UnknownAttachmentError}>
          <ChooseRobotToRunProtocolSlideout
            onCloseClick={() => {
              setShowChooseRobotToRunProtocolSlideout(false)
            }}
            showSlideout={showChooseRobotToRunProtocolSlideout}
            storedProtocolData={props}
          />
          <SendProtocolToFlexSlideout
            isExpanded={showSendProtocolToFlexSlideout}
            onCloseClick={() => {
              setShowSendProtocolToFlexSlideout(false)
            }}
            storedProtocolData={props}
          />

          <Flex
            backgroundColor={COLORS.white}
            borderRadius={BORDERS.borderRadius4}
            position={POSITION_RELATIVE}
            flexDirection={DIRECTION_ROW}
            width="100%"
            marginBottom={SPACING.spacing16}
          >
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing16}
              padding={`${SPACING.spacing16} 0 ${SPACING.spacing16} ${SPACING.spacing16}`}
              width="100%"
            >
              {analysisStatus !== 'loading' &&
              mostRecentAnalysis?.result === 'parameter-value-required' ? (
                <ProtocolStatusBanner />
              ) : null}
              {mostRecentAnalysis != null && analysisStatus === 'error' ? (
                <ProtocolAnalysisFailure
                  protocolKey={protocolKey}
                  errors={mostRecentAnalysis.errors.map(e => e.detail)}
                />
              ) : null}
              <LegacyStyledText
                css={TYPOGRAPHY.h2SemiBold}
                marginBottom={SPACING.spacing16}
                data-testid={`ProtocolDetails_${protocolDisplayName}`}
                overflowWrap={OVERFLOW_WRAP_ANYWHERE}
              >
                {protocolDisplayName}
              </LegacyStyledText>
              <Flex css={GRID_STYLE}>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  data-testid="ProtocolDetails_creationMethod"
                >
                  <LegacyStyledText as="h6" color={COLORS.grey60}>
                    {t('creation_method')}
                  </LegacyStyledText>
                  <LegacyStyledText as="p">
                    {analysisStatus === 'loading'
                      ? t('shared:loading')
                      : creationMethod}
                  </LegacyStyledText>
                </Flex>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  data-testid="ProtocolDetails_lastUpdated"
                >
                  <LegacyStyledText as="h6" color={COLORS.grey60}>
                    {t('last_updated')}
                  </LegacyStyledText>
                  <LegacyStyledText as="p">
                    {analysisStatus === 'loading'
                      ? t('shared:loading')
                      : format(new Date(modified), 'M/d/yy HH:mm')}
                  </LegacyStyledText>
                </Flex>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  data-testid="ProtocolDetails_lastAnalyzed"
                >
                  <LegacyStyledText as="h6" color={COLORS.grey60}>
                    {t('last_analyzed')}
                  </LegacyStyledText>
                  <LegacyStyledText as="p">
                    {analysisStatus === 'loading'
                      ? t('shared:loading')
                      : lastAnalyzed}
                  </LegacyStyledText>
                </Flex>
                <Flex
                  css={css`
                    display: ${DISPLAY_GRID};
                    justify-self: end;
                  `}
                >
                  <PrimaryButton
                    onClick={() => {
                      handleRunProtocolButtonClick()
                    }}
                    data-testid="ProtocolDetails_runProtocol"
                    disabled={analysisStatus === 'loading'}
                  >
                    {t('start_setup')}
                  </PrimaryButton>
                </Flex>
              </Flex>
              <Divider marginY={SPACING.spacing16} />
              <Flex css={TWO_COL_GRID_STYLE}>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  data-testid="ProtocolDetails_author"
                >
                  <LegacyStyledText as="h6" color={COLORS.grey60}>
                    {t('org_or_author')}
                  </LegacyStyledText>
                  <LegacyStyledText
                    as="p"
                    overflowWrap={OVERFLOW_WRAP_ANYWHERE}
                  >
                    {analysisStatus === 'loading'
                      ? t('shared:loading')
                      : author}
                  </LegacyStyledText>
                </Flex>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  data-testid="ProtocolDetails_description"
                >
                  <LegacyStyledText as="h6" color={COLORS.grey60}>
                    {t('description')}
                  </LegacyStyledText>
                  {analysisStatus === 'loading' ? (
                    <LegacyStyledText as="p">
                      {t('shared:loading')}
                    </LegacyStyledText>
                  ) : null}
                  {mostRecentAnalysis != null ? (
                    <ReadMoreContent
                      metadata={mostRecentAnalysis.metadata}
                      protocolType={mostRecentAnalysis.config.protocolType}
                    />
                  ) : null}
                </Flex>
              </Flex>
            </Flex>
            <Box
              position={POSITION_RELATIVE}
              top={SPACING.spacing2}
              right={SPACING.spacing2}
            >
              <ProtocolOverflowMenu
                handleRunProtocol={() => {
                  setShowChooseRobotToRunProtocolSlideout(true)
                }}
                handleSendProtocolToFlex={() => {
                  setShowSendProtocolToFlexSlideout(true)
                }}
                storedProtocolData={props}
                data-testid="ProtocolDetails_overFlowMenu"
              />
            </Box>
          </Flex>
          <Flex
            flexDirection={DIRECTION_ROW}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            marginBottom={SPACING.spacing16}
          >
            <Flex
              flex={`0 0 ${String(SIZE_5)}`}
              flexDirection={DIRECTION_COLUMN}
              backgroundColor={COLORS.white}
              borderRadius={BORDERS.borderRadius8}
              height="100%"
              data-testid="ProtocolDetails_deckMap"
            >
              <Flex
                alignItems={ALIGN_CENTER}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                padding={SPACING.spacing16}
              >
                <LegacyStyledText
                  as="h3"
                  fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                >
                  {t('deck_view')}
                </LegacyStyledText>
                <Btn
                  alignItems={ALIGN_CENTER}
                  disabled={analysisStatus !== 'complete'}
                  display={DISPLAY_FLEX}
                  justifyContent={JUSTIFY_CENTER}
                  height={SPACING.spacing24}
                  width={SPACING.spacing24}
                  css={ZOOM_ICON_STYLE}
                  onClick={() => {
                    setShowDeckViewModal(true)
                  }}
                >
                  <Icon
                    name="union"
                    size={SIZE_1}
                    color={
                      analysisStatus !== 'complete'
                        ? COLORS.grey40
                        : COLORS.grey60
                    }
                  />
                </Btn>
              </Flex>
              <Box padding={SPACING.spacing16} backgroundColor={COLORS.white}>
                {deckViewByAnalysisStatus[analysisStatus]}
              </Box>
            </Flex>

            <Flex
              width="100%"
              height="100%"
              flexDirection={DIRECTION_COLUMN}
              marginLeft={SPACING.spacing16}
              gridGap={SPACING.spacing8}
            >
              <Flex gridGap={SPACING.spacing4}>
                {mostRecentAnalysis != null && (
                  <Tabs
                    tabs={[
                      {
                        text: i18n.format(t('parameters'), 'capitalize'),
                        isActive: currentTab === 'parameters',
                        disabled: false,
                        onClick: () => {
                          setCurrentTab('parameters')
                        },
                      },
                    ]}
                  />
                )}
                <Tabs
                  tabs={[
                    {
                      text: i18n.format(t('hardware'), 'capitalize'),
                      isActive: currentTab === 'robot_config',
                      disabled: false,
                      onClick: () => {
                        setCurrentTab('robot_config')
                      },
                    },
                    {
                      text: i18n.format(t('labware'), 'capitalize'),
                      isActive: currentTab === 'labware',
                      disabled: false,
                      onClick: () => {
                        setCurrentTab('labware')
                      },
                    },
                  ]}
                />
                {mostRecentAnalysis != null && (
                  <Tabs
                    tabs={[
                      {
                        text: i18n.format(t('liquids'), 'capitalize'),
                        isActive: currentTab === 'liquids',
                        disabled: false,
                        onClick: () => {
                          setCurrentTab('liquids')
                        },
                      },
                    ]}
                  />
                )}
                {enableProtocolStats && mostRecentAnalysis != null && (
                  <Tabs
                    tabs={[
                      {
                        text: i18n.format(t('stats'), 'capitalize'),
                        isActive: currentTab === 'stats',
                        disabled: false,
                        onClick: () => {
                          setCurrentTab('stats')
                        },
                      },
                    ]}
                  />
                )}
                {enableProtocolTimeline && mostRecentAnalysis != null && (
                  <Tabs
                    tabs={[
                      {
                        text: i18n.format(t('timeline'), 'capitalize'),
                        isActive: currentTab === 'timeline',
                        disabled: false,
                        onClick: () => {
                          setCurrentTab('timeline')
                        },
                      },
                    ]}
                  />
                )}
              </Flex>
              <Box
                backgroundColor={COLORS.white}
                borderRadius={BORDERS.borderRadius8}
                padding={SPACING.spacing16}
              >
                {contentsByTabName[currentTab]}
              </Box>
            </Flex>
          </Flex>
        </ErrorBoundary>
      </Flex>
    </>
  )
}
