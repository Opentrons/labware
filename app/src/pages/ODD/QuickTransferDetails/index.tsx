import { useState, useEffect } from 'react'
import last from 'lodash/last'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from 'react-query'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  Chip,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_WRAP_ANYWHERE,
  POSITION_STICKY,
  SPACING,
  LegacyStyledText,
  truncateString,
  Tabs,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  useCreateRunMutation,
  useHost,
  useProtocolAnalysisAsDocumentQuery,
  useProtocolQuery,
} from '@opentrons/react-api-client'
import { MAXIMUM_PINNED_PROTOCOLS } from '/app/App/constants'
import { MediumButton, SmallButton } from '/app/atoms/buttons'
import {
  ProtocolDetailsHeaderChipSkeleton,
  ProcotolDetailsHeaderTitleSkeleton,
  ProtocolDetailsSectionContentSkeleton,
} from '/app/organisms/ODD/ProtocolDetails'
import { useHardwareStatusText } from '/app/organisms/ODD/RobotDashboard/hooks'
import { SmallModalChildren } from '/app/molecules/OddModal'
import { useToaster } from '/app/organisms/ToasterOven'
import {
  getApplyHistoricOffsets,
  getPinnedQuickTransferIds,
  updateConfigValue,
} from '/app/redux/config'
import {
  ANALYTICS_QUICK_TRANSFER_DETAILS_PAGE,
  ANALYTICS_QUICK_TRANSFER_RUN_FROM_DETAILS,
} from '/app/redux/analytics'
import { useTrackEventWithRobotSerial } from '/app/redux-resources/analytics'
import { useOffsetCandidatesForAnalysis } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/useOffsetCandidatesForAnalysis'
import { useMissingProtocolHardware } from '/app/transformations/commands'
import { DeleteTransferConfirmationModal } from '../QuickTransferDashboard/DeleteTransferConfirmationModal'
import { Deck } from './Deck'
import { Hardware } from './Hardware'
import { Labware } from './Labware'
import { formatTimeWithUtcLabel } from '/app/resources/runs'
import { useScrollPosition } from '/app/local-resources/dom-utils'

import type { Protocol } from '@opentrons/api-client'
import type { Dispatch } from '/app/redux/types'
import type { OnDeviceRouteParams } from '/app/App/types'

interface QuickTransferHeaderProps {
  title?: string | null
  handleRunTransfer: () => void
  chipText: string
  isScrolled: boolean
  isTransferFetching: boolean
}

const QuickTransferHeader = ({
  title,
  handleRunTransfer,
  chipText,
  isScrolled,
  isTransferFetching,
}: QuickTransferHeaderProps): JSX.Element => {
  const navigate = useNavigate()
  const { trackEventWithRobotSerial } = useTrackEventWithRobotSerial()
  const { t } = useTranslation('protocol_details')
  const [truncate, setTruncate] = useState<boolean>(true)
  const [startSetup, setStartSetup] = useState<boolean>(false)
  const toggleTruncate = (): void => {
    setTruncate(value => !value)
  }

  let displayedTitle = title ?? null
  if (displayedTitle !== null && displayedTitle.length > 92 && truncate) {
    displayedTitle = truncateString(displayedTitle, 80, 60)
  }

  useEffect(() => {
    trackEventWithRobotSerial({
      name: ANALYTICS_QUICK_TRANSFER_DETAILS_PAGE,
      properties: {
        name: title,
      },
    })
  }, [])

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      boxShadow={isScrolled ? BORDERS.shadowBig : undefined}
      gridGap={SPACING.spacing40}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      padding={`${SPACING.spacing32} ${SPACING.spacing40}`}
      position={POSITION_STICKY}
      top="0"
      backgroundColor={COLORS.white}
      marginX={`-${SPACING.spacing32}`}
      zIndex={1} // the header is always visble when things scroll beneath
    >
      <Flex
        alignItems={ALIGN_CENTER}
        gridGap={SPACING.spacing16}
        width="42.125rem"
      >
        <Btn
          paddingLeft="0rem"
          paddingRight={SPACING.spacing24}
          onClick={() => {
            navigate('/quick-transfer')
          }}
          width="3rem"
        >
          <Icon name="back" size="3rem" color={COLORS.black90} />
        </Btn>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
          maxWidth="42.625rem"
        >
          <Flex maxWidth="max-content">
            {!isTransferFetching ? (
              <Chip
                type={chipText === 'Ready to run' ? 'success' : 'warning'}
                text={chipText}
              />
            ) : (
              <ProtocolDetailsHeaderChipSkeleton />
            )}
          </Flex>
          {!isTransferFetching ? (
            <LegacyStyledText
              as="h2"
              fontWeight={TYPOGRAPHY.fontWeightBold}
              onClick={toggleTruncate}
              overflowWrap={OVERFLOW_WRAP_ANYWHERE}
            >
              {displayedTitle}
            </LegacyStyledText>
          ) : (
            <ProcotolDetailsHeaderTitleSkeleton />
          )}
        </Flex>
      </Flex>
      <SmallButton
        buttonCategory="rounded"
        onClick={() => {
          setStartSetup(true)
          handleRunTransfer()
          trackEventWithRobotSerial({
            name: ANALYTICS_QUICK_TRANSFER_RUN_FROM_DETAILS,
            properties: {
              name: title,
            },
          })
        }}
        buttonText={t('start_setup')}
        disabled={isTransferFetching}
        iconName={startSetup ? 'ot-spinner' : undefined}
        iconPlacement="endIcon"
      />
    </Flex>
  )
}

const transferSectionTabOptions = [
  'summary',
  'hardware',
  'labware',
  'deck',
] as const

type TabOption = typeof transferSectionTabOptions[number]

interface TransferSectionTabsProps {
  currentOption: TabOption
  setCurrentOption: (option: TabOption) => void
}

const TransferSectionTabs = ({
  currentOption,
  setCurrentOption,
}: TransferSectionTabsProps): JSX.Element => {
  const { t, i18n } = useTranslation('protocol_details')
  const options = transferSectionTabOptions

  return (
    <Flex gridGap={SPACING.spacing8}>
      <Tabs
        tabs={options.map(option => ({
          text: i18n.format(t(option), 'capitalize'),
          onClick: () => {
            setCurrentOption(option)
          },
          isActive: option === currentOption,
          disabled: false,
        }))}
      />
    </Flex>
  )
}

interface SummaryProps {
  description: string | null
  date: string | null
}

const Summary = ({ description, date }: SummaryProps): JSX.Element => {
  const { t } = useTranslation(['protocol_info', 'shared'])
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      paddingBottom={SPACING.spacing24}
    >
      <LegacyStyledText
        as="p"
        color={description === null ? COLORS.grey60 : undefined}
      >
        {description}
      </LegacyStyledText>
      <Flex
        backgroundColor={COLORS.grey35}
        borderRadius={BORDERS.borderRadius8}
        marginTop={SPACING.spacing24}
        width="max-content"
        padding={`${SPACING.spacing8} ${SPACING.spacing12}`}
      >
        <LegacyStyledText as="p">{`${t('protocol_info:date_added')}: ${
          date != null ? formatTimeWithUtcLabel(date) : t('shared:no_data')
        }`}</LegacyStyledText>
      </Flex>
    </Flex>
  )
}

interface TransferSectionContentProps {
  transferId: string
  transferData?: Protocol | null
  currentOption: TabOption
}
const TransferSectionContent = ({
  transferId,
  transferData,
  currentOption,
}: TransferSectionContentProps): JSX.Element | null => {
  if (transferData == null) return null

  let protocolSection: JSX.Element | null = null
  switch (currentOption) {
    case 'summary':
      protocolSection = (
        <Summary
          date={transferData.data.createdAt ?? null}
          description={transferData.data.metadata.description ?? null}
        />
      )
      break
    case 'hardware':
      protocolSection = <Hardware transferId={transferId} />
      break
    case 'labware':
      protocolSection = <Labware transferId={transferId} />
      break
    case 'deck':
      protocolSection = <Deck transferId={transferId} />
      break
  }
  return (
    <Flex
      paddingTop={SPACING.spacing32}
      justifyContent={currentOption === 'deck' ? JUSTIFY_CENTER : undefined}
    >
      {protocolSection}
    </Flex>
  )
}

export function QuickTransferDetails(): JSX.Element | null {
  const { t, i18n } = useTranslation(['quick_transfer', 'shared'])
  const { quickTransferId: transferId } = useParams<
    keyof OnDeviceRouteParams
  >() as OnDeviceRouteParams
  const {
    missingProtocolHardware,
    conflictedSlots,
  } = useMissingProtocolHardware(transferId)
  const chipText = useHardwareStatusText(
    missingProtocolHardware,
    conflictedSlots
  )

  const dispatch = useDispatch<Dispatch>()
  const host = useHost()
  const { makeSnackbar } = useToaster()
  const queryClient = useQueryClient()
  const [currentOption, setCurrentOption] = useState<TabOption>(
    transferSectionTabOptions[0]
  )

  const [showMaxPinsAlert, setShowMaxPinsAlert] = useState<boolean>(false)
  const {
    data: protocolRecord,
    isLoading: isTransferFetching,
  } = useProtocolQuery(transferId, {
    staleTime: Infinity,
  })

  // Watch for scrolling to toggle dropshadow
  const { scrollRef, isScrolled } = useScrollPosition()

  let pinnedTransferIds = useSelector(getPinnedQuickTransferIds) ?? []
  const pinned = pinnedTransferIds.includes(transferId)

  const {
    data: mostRecentAnalysis,
  } = useProtocolAnalysisAsDocumentQuery(
    transferId,
    last(protocolRecord?.data.analysisSummaries)?.id ?? null,
    { enabled: protocolRecord != null }
  )

  const shouldApplyOffsets = useSelector(getApplyHistoricOffsets)
  // I'd love to skip scraping altogether if we aren't applying
  // conditional offsets, but React won't let us use hooks conditionally.
  // So, we'll scrape regardless and just toss them if we don't need them.
  const scrapedLabwareOffsets = useOffsetCandidatesForAnalysis(
    mostRecentAnalysis ?? null
  ).map(({ vector, location, definitionUri }) => ({
    vector,
    location,
    definitionUri,
  }))
  const labwareOffsets = shouldApplyOffsets ? scrapedLabwareOffsets : []

  const { createRun } = useCreateRunMutation({
    onSuccess: data => {
      queryClient.invalidateQueries([host, 'runs']).catch((e: Error) => {
        console.error(`could not invalidate runs cache: ${e.message}`)
      })
    },
  })

  const handlePinClick = (): void => {
    if (!pinned) {
      if (pinnedTransferIds.length === MAXIMUM_PINNED_PROTOCOLS) {
        setShowMaxPinsAlert(true)
      } else {
        pinnedTransferIds.push(transferId)
        makeSnackbar(t('pinned_transfer') as string)
      }
    } else {
      pinnedTransferIds = pinnedTransferIds.filter(p => p !== transferId)
      makeSnackbar(t('unpinned_transfer') as string)
    }
    dispatch(
      updateConfigValue('protocols.pinnedQuickTransferIds', pinnedTransferIds)
    )
  }
  const handleRunTransfer = (): void => {
    createRun({ protocolId: transferId, labwareOffsets })
  }
  const [
    showConfirmDeleteTransfer,
    setShowConfirmationDeleteTransfer,
  ] = useState<boolean>(false)

  const displayName =
    !isTransferFetching && protocolRecord != null
      ? protocolRecord?.data.metadata.protocolName ??
        protocolRecord?.data.files[0].name
      : null

  return (
    <>
      {showConfirmDeleteTransfer ? (
        <DeleteTransferConfirmationModal
          transferId={transferId}
          setShowDeleteConfirmationModal={setShowConfirmationDeleteTransfer}
        />
      ) : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        paddingX={SPACING.spacing40}
        paddingBottom={SPACING.spacing40}
      >
        {showMaxPinsAlert && (
          <SmallModalChildren
            header={t('too_many_pins_header')}
            subText={t('too_many_pins_body')}
            buttonText={i18n.format(t('shared:close'), 'capitalize')}
            handleCloseMaxPinsAlert={() => {
              setShowMaxPinsAlert(false)
            }}
          />
        )}
        {/* Empty box to detect scrolling */}
        <Flex ref={scrollRef} />
        <QuickTransferHeader
          title={displayName}
          handleRunTransfer={handleRunTransfer}
          chipText={chipText}
          isScrolled={isScrolled}
          isTransferFetching={isTransferFetching}
        />
        <Flex flexDirection={DIRECTION_COLUMN} paddingTop={SPACING.spacing6}>
          <TransferSectionTabs
            currentOption={currentOption}
            setCurrentOption={setCurrentOption}
          />
          {!isTransferFetching ? (
            <TransferSectionContent
              transferId={transferId}
              transferData={protocolRecord}
              currentOption={currentOption}
            />
          ) : (
            <ProtocolDetailsSectionContentSkeleton />
          )}
          <Flex
            flexDirection={DIRECTION_ROW}
            gridGap={SPACING.spacing8}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            paddingTop={
              // Skeleton is large. Better UX not to scroll to see buttons while loading.
              !isTransferFetching ? SPACING.spacing60 : SPACING.spacing24
            }
          >
            <MediumButton
              buttonText={pinned ? t('unpin_transfer') : t('pin_transfer')}
              buttonType="secondary"
              iconName="pin"
              onClick={handlePinClick}
              width="100%"
            />
            <MediumButton
              buttonText={t('delete_transfer')}
              buttonType="alertSecondary"
              iconName="trash"
              onClick={() => {
                setShowConfirmationDeleteTransfer(true)
              }}
              width="100%"
            />
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}
