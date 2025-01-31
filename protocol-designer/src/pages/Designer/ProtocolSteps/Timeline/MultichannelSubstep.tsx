import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DeckInfoLabel,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListButton,
  SPACING,
  StyledText,
  Tag,
} from '@opentrons/components'
import { Substep } from './Substep'
import { formatVolume } from './utils'
import type { AdditionalEquipmentName } from '@opentrons/step-generation'
import type {
  StepItemSourceDestRow,
  SubstepIdentifier,
} from '../../../../steplist'

interface MultichannelSubstepProps {
  trashName: AdditionalEquipmentName | null
  rowGroup: StepItemSourceDestRow[]
  stepId: string
  substepIndex: number
  selectSubstep: (substepIdentifier: SubstepIdentifier) => void
  highlighted?: boolean
  isSameLabware?: boolean
}

export function MultichannelSubstep(
  props: MultichannelSubstepProps
): JSX.Element {
  const {
    rowGroup,
    stepId,
    selectSubstep,
    substepIndex,
    trashName,
    isSameLabware,
  } = props
  const { t } = useTranslation('application')
  const [collapsed, setCollapsed] = useState<Boolean>(true)
  const handleToggleCollapsed = (): void => {
    setCollapsed(!collapsed)
  }

  const firstChannelSource = rowGroup[0].source
  const lastChannelSource = rowGroup[rowGroup.length - 1].source
  const sourceWellRange = `${
    firstChannelSource ? firstChannelSource.well : ''
  }:${lastChannelSource ? lastChannelSource.well : ''}`
  const firstChannelDest = rowGroup[0].dest
  const lastChannelDest = rowGroup[rowGroup.length - 1].dest
  const destWellRange = `${
    firstChannelDest ? firstChannelDest.well ?? 'Trash' : ''
  }:${lastChannelDest ? lastChannelDest.well : ''}`

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      width="100%"
      onMouseEnter={() => {
        selectSubstep({ stepId, substepIndex })
      }}
      onMouseLeave={() => {
        selectSubstep(null)
      }}
    >
      {/* TODO: need to update this to match designs! */}
      <ListButton type="noActive" onClick={handleToggleCollapsed}>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing4}
          width="100%"
        >
          <Flex
            padding={SPACING.spacing12}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            width="100%"
            alignItems={ALIGN_CENTER}
          >
            <StyledText desktopStyle="bodyDefaultRegular">Multi</StyledText>
            {firstChannelSource != null ? (
              <DeckInfoLabel deckLabel={sourceWellRange} />
            ) : null}
            <Tag
              text={`${formatVolume(rowGroup[0].volume)} ${t(
                'units.microliter'
              )}`}
              type="default"
            />
            {firstChannelDest != null ? (
              <DeckInfoLabel deckLabel={destWellRange} />
            ) : null}
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            {!collapsed &&
              rowGroup.map((row, rowKey) => {
                return (
                  <Substep
                    trashName={trashName}
                    key={rowKey}
                    volume={row.volume}
                    source={row.source}
                    dest={row.dest}
                    stepId={stepId}
                    substepIndex={substepIndex}
                    isSameLabware={isSameLabware}
                  />
                )
              })}
          </Flex>
        </Flex>
      </ListButton>
    </Flex>
  )
}
