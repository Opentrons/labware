import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  Flex,
  StyledText,
  ListButton,
  DeckInfoLabel,
  SPACING,
  getLabwareDisplayLocation,
  JUSTIFY_SPACE_BETWEEN,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  selectSelectedLabwareInfo,
  selectSelectedLwInitialPosition,
  selectSelectedOffsetDetails,
  setSelectedLabware,
} from '/app/redux/protocol-runs'

import type { State } from '/app/redux/types'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type {
  LPCWizardState,
  OffsetDetails,
  SelectedLabwareInfo,
} from '/app/redux/protocol-runs'

export function AppliedLocationOffsetsContainer(
  props: LPCWizardContentProps
): JSX.Element {
  const offsetDetails = useSelector(selectSelectedOffsetDetails(props.runId))

  return (
    <Flex css={APPLIED_LOCATION_CONTAINER_STYLE}>
      {offsetDetails.map(offset => (
        <LabwareLocationItemContainer
          key={`${offset.locationDetails.slotName}${offset.locationDetails.moduleId}${offset.locationDetails.adapterId}`}
          {...props}
          offsetDetail={offset}
        />
      ))}
      {/* Gives extra scrollable space. */}
      <Flex css={BOX_STYLE} />
    </Flex>
  )
}

interface LabwareLocationItemProps extends LPCWizardContentProps {
  offsetDetail: OffsetDetails
}

function LabwareLocationItemContainer(
  props: LabwareLocationItemProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  return (
    <Flex css={LOCATION_ITEM_CONTAINER_STYLE}>
      <Flex css={HEADER_STYLE}>
        <StyledText oddStyle="smallBodyTextSemiBold">
          {t('slot_location')}
        </StyledText>
        <StyledText oddStyle="smallBodyTextSemiBold">{t('offsets')}</StyledText>
      </Flex>
      <LabwareLocationItem {...props} />
    </Flex>
  )
}

function LabwareLocationItem({
  runId,
  offsetDetail,
  commandUtils,
}: LabwareLocationItemProps): JSX.Element {
  const { t: commandTextT } = useTranslation('protocol_command_text')
  const { toggleRobotMoving, handleCheckItemsPrepModules } = commandUtils
  const dispatch = useDispatch()

  const { protocolData } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const selectedLw = useSelector(
    selectSelectedLabwareInfo(runId)
  ) as SelectedLabwareInfo
  const initialPosition = useSelector(selectSelectedLwInitialPosition(runId))

  const slotCopy = getLabwareDisplayLocation({
    t: commandTextT,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
    location: { slotName: offsetDetail.locationDetails.slotName as string },
    detailLevel: 'slot-only',
  })

  const handleOnClick = (): void => {
    void toggleRobotMoving(true)
      .then(() => {
        dispatch(
          setSelectedLabware(
            runId,
            selectedLw.uri,
            offsetDetail.locationDetails
          )
        )
      })
      .then(() =>
        handleCheckItemsPrepModules(
          offsetDetail.locationDetails,
          initialPosition
        )
      )
      .finally(() => toggleRobotMoving(false))
  }

  return (
    <ListButton type="noActive" onClick={handleOnClick}>
      <Flex css={BUTTON_TEXT_STYLE}>
        {/* TODO(jh, 01-30-31): Add a new detail level to getLabwareDisplayLocation instead of slicing. */}
        <DeckInfoLabel deckLabel={slotCopy.slice(-2)} />
      </Flex>
    </ListButton>
  )
}

const APPLIED_LOCATION_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing24};
`

const HEADER_STYLE = css`
  padding: 0 1.375rem;
  grid-gap: 3.813rem;
`

const LOCATION_ITEM_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
`

const BUTTON_TEXT_STYLE = css`
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
`

const BOX_STYLE = css`
  height: ${SPACING.spacing40};
`
