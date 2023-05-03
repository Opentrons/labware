import * as React from 'react'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { formatDistance } from 'date-fns'

import {
  Flex,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  DIRECTION_COLUMN,
  BORDERS,
} from '@opentrons/components'
import { useAllRunsQuery } from '@opentrons/react-api-client'

import { StyledText } from '../../../atoms/text'
import { Chip } from '../../../atoms/Chip'
import { ODD_FOCUS_VISIBLE } from '../../../atoms/buttons/OnDeviceDisplay/constants'
import { useRunControls } from '../../RunTimeControl/hooks'
import { useTrackEvent } from '../../../redux/analytics'
import { useTrackProtocolRunEvent } from '../../Devices/hooks'
import { useMissingProtocolHardware } from '../../../pages/Protocols/hooks'

import type { Run } from '@opentrons/api-client'

interface RecentRunProtocolCardProps {
  /** protocol name that was run recently */
  protocolName: string
  /** protocol id that was run recently  */
  protocolId: string
  /** the time that this recent run was created  */
  lastRun?: string
}

export function RecentRunProtocolCard({
  protocolName,
  protocolId,
  lastRun,
}: RecentRunProtocolCardProps): JSX.Element {
  const { t, i18n } = useTranslation('device_details')
  const missingProtocolHardware = useMissingProtocolHardware(protocolId)
  const history = useHistory()
  const isReadyToBeReRun = missingProtocolHardware.length === 0
  const { data: allRuns } = useAllRunsQuery()
  const runId =
    allRuns?.data.find(run => run.protocolId === protocolId)?.id ?? null
  const trackEvent = useTrackEvent()
  const { trackProtocolRunEvent } = useTrackProtocolRunEvent(runId)
  const onResetSuccess = (createRunResponse: Run): void =>
    runId != null
      ? history.push(`protocols/${runId}/setup`)
      : history.push(`protocols/${createRunResponse.data.id}`)
  const { reset } = useRunControls(runId, onResetSuccess)

  const PROTOCOL_CARD_STYLE = css`
    &:active {
      background-color: ${isReadyToBeReRun
        ? COLORS.green_three_pressed
        : COLORS.yellow_three_pressed};
    }
    &:focus-visible {
      box-shadow: ${ODD_FOCUS_VISIBLE};
    }
  `

  const PROTOCOL_TEXT_STYLE = css`
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
    overflow: hidden;
    overflow-wrap: break-word;
    height: max-content;
  `

  const missingProtocolHardwareType = missingProtocolHardware.map(
    hardware => hardware.hardwareType
  )

  // Note(kj:04/13/2023) This component only check the type and count the number
  // If we need to display any specific information, we will need to use filter
  const countMissingHardwareType = (hwType: 'pipette' | 'module'): number => {
    return missingProtocolHardwareType.reduce((acc, hardwareType) => {
      if (hardwareType === hwType) {
        return acc + 1
      }
      return acc
    }, 0)
  }

  const countMissingPipettes = countMissingHardwareType('pipette')
  const countMissingModules = countMissingHardwareType('module')

  let chipText: string = t('ready_to_run')
  if (countMissingPipettes === 0 && countMissingModules > 0) {
    if (countMissingModules === 1) {
      chipText = t('missing_module', {
        num: countMissingModules,
      })
    } else {
      chipText = t('missing_module_plural', {
        count: countMissingModules,
      })
    }
  } else if (countMissingPipettes > 0 && countMissingModules === 0) {
    if (countMissingPipettes === 1) {
      chipText = t('missing_pipette', {
        num: countMissingPipettes,
      })
    } else {
      chipText = t('missing_pipettes_plural', {
        count: countMissingPipettes,
      })
    }
  } else if (countMissingPipettes > 0 && countMissingModules > 0) {
    chipText = t('missing_both')
  }
  const handleCardClick = (): void => {
    reset()
    trackEvent({
      name: 'proceedToRun',
      properties: { sourceLocation: 'RecentRunProtocolCard' },
    })
    trackProtocolRunEvent({ name: 'runAgain' })
  }

  return (
    <Flex
      aria-label="RecentRunProtocolCard"
      css={PROTOCOL_CARD_STYLE}
      flexDirection={DIRECTION_COLUMN}
      padding={SPACING.spacing5}
      gridGap={SPACING.spacing5}
      backgroundColor={
        isReadyToBeReRun ? COLORS.green_three : COLORS.yellow_three
      }
      width="25.8125rem"
      borderRadius={BORDERS.size_four}
      onClick={handleCardClick}
    >
      {/* marginLeft is needed to cancel chip's padding */}
      {/* <Flex marginLeft={`-${SPACING.spacing4}`}> */}
      <Flex>
        <Chip
          paddingLeft="0"
          type={isReadyToBeReRun ? 'success' : 'warning'}
          background={false}
          text={i18n.format(chipText, 'capitalize')}
        />
      </Flex>
      <Flex width="100%" height="14rem">
        <StyledText
          fontSize={TYPOGRAPHY.fontSize32}
          fontWeight={TYPOGRAPHY.fontWeightLevel2_bold}
          lineHeight={TYPOGRAPHY.lineHeight42}
          css={PROTOCOL_TEXT_STYLE}
        >
          {protocolName}
        </StyledText>
      </Flex>
      <StyledText
        fontSize={TYPOGRAPHY.fontSize22}
        fontWeight={TYPOGRAPHY.fontWeightRegular}
        lineHeight={TYPOGRAPHY.lineHeight28}
        color={COLORS.darkBlack_seventy}
      >
        {i18n.format(t('last_run_time'), 'capitalize')}{' '}
        {lastRun != null
          ? formatDistance(new Date(lastRun), new Date(), {
              addSuffix: true,
            }).replace('about ', '')
          : ''}
      </StyledText>
    </Flex>
  )
}
