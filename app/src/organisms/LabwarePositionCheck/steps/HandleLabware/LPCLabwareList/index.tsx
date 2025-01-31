import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  Flex,
  StyledText,
  SPACING,
  ListButton,
  DIRECTION_COLUMN,
} from '@opentrons/components'

import {
  selectAllLabwareInfo,
  setSelectedLabwareName,
} from '/app/redux/protocol-runs'
import { LIST_CONTAINER_STYLE } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/contants'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LabwareDetails } from '/app/redux/protocol-runs'

export function LPCLabwareList(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const labwareInfo = useSelector(selectAllLabwareInfo(props.runId))

  return (
    <Flex css={LIST_CONTAINER_STYLE}>
      <StyledText>{t('select_labware_from_list')}</StyledText>
      <Flex css={LIST_STYLE}>
        {Object.entries(labwareInfo).map(([uri, info]) => (
          <LabwareItem
            key={`labware_${uri}`}
            uri={uri}
            info={info}
            {...props}
          />
        ))}
      </Flex>
    </Flex>
  )
}

interface LabwareItemProps extends LPCWizardContentProps {
  uri: string
  info: LabwareDetails
}

function LabwareItem({ uri, info, runId }: LabwareItemProps): JSX.Element {
  const dispatch = useDispatch()

  const handleOnClick = (): void => {
    dispatch(setSelectedLabwareName(runId, uri))
  }

  return (
    <ListButton type="noActive" onClick={handleOnClick}>
      <Flex css={BUTTON_TEXT_STYLE}>
        <StyledText>{info.displayName}</StyledText>
      </Flex>
    </ListButton>
  )
}

const LIST_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
`

const BUTTON_TEXT_STYLE = css`
  grid-gap: ${SPACING.spacing24};
`
