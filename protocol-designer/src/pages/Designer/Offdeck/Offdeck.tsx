import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  LabwareRender,
  POSITION_RELATIVE,
  RobotCoordsForeignDiv,
  RobotWorkSpace,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getCustomLabwareDefsByURI } from '../../../labware-defs/selectors'
import { getOnlyLatestDefs } from '../../../labware-defs'
import { selectors } from '../../../labware-ingred/selectors'
import { selectZoomedIntoSlot } from '../../../labware-ingred/actions'
import { DeckSetupTools } from '../DeckSetup/DeckSetupTools'
import { LabwareLabel } from '../LabwareLabel'
import { OffDeckDetails } from './OffDeckDetails'
import type { DeckSetupTabType } from '../types'

const STANDARD_X_WIDTH = '127.76px'
const STANDARD_Y_HEIGHT = '85.48px'

export function OffDeck(props: DeckSetupTabType): JSX.Element {
  const { tab } = props
  const { t, i18n } = useTranslation('starting_deck_state')
  const [hoveredLabware, setHoveredLabware] = useState<string | null>(null)
  const dispatch = useDispatch()

  const selectedSlotInfo = useSelector(selectors.getZoomedInSlotInfo)
  const { selectedLabwareDefUri, selectedSlot } = selectedSlotInfo

  const customLabwareDefs = useSelector(getCustomLabwareDefsByURI)
  const defs = getOnlyLatestDefs()

  const hoveredLabwareDef =
    hoveredLabware != null
      ? defs[hoveredLabware] ?? customLabwareDefs[hoveredLabware] ?? null
      : null
  const offDeckLabware =
    selectedLabwareDefUri != null ? defs[selectedLabwareDefUri] ?? null : null

  let labware = (
    <RobotWorkSpace
      key="emptyState"
      viewBox={`-25 -32 182.5142857143 122.1142857143`}
    >
      {() => (
        <RobotCoordsForeignDiv>
          <Box
            backgroundColor={COLORS.grey40}
            borderRadius={BORDERS.borderRadius8}
            width={STANDARD_X_WIDTH}
            height={STANDARD_Y_HEIGHT}
          />
        </RobotCoordsForeignDiv>
      )}
    </RobotWorkSpace>
  )
  if (hoveredLabwareDef != null && hoveredLabwareDef !== offDeckLabware) {
    labware = (
      <RobotWorkSpace
        key={hoveredLabwareDef.parameters.loadName}
        viewBox={`-25 -32 ${hoveredLabwareDef.dimensions.xDimension / 0.7} ${
          hoveredLabwareDef.dimensions.yDimension / 0.7
        }`}
      >
        {() => (
          <>
            <LabwareRender definition={hoveredLabwareDef} />
            <LabwareLabel
              isLast={true}
              isSelected={false}
              labwareDef={hoveredLabwareDef}
              position={[0, 0, 0]}
            />
          </>
        )}
      </RobotWorkSpace>
    )
  } else if (offDeckLabware != null) {
    const def = offDeckLabware
    labware = (
      <RobotWorkSpace
        key={def.parameters.loadName}
        viewBox={`-25 -32 ${def.dimensions.xDimension / 0.7} ${
          def.dimensions.yDimension / 0.7
        }`}
      >
        {() => (
          <>
            <LabwareRender definition={def} />

            <LabwareLabel
              isLast={true}
              isSelected={true}
              labwareDef={def}
              position={[0, 0, 0]}
            />
          </>
        )}
      </RobotWorkSpace>
    )
  }

  return (
    <Flex width="100%">
      {selectedSlot.slot === 'offDeck' ? (
        <Flex
          alignItems={ALIGN_CENTER}
          width="100%"
          padding={SPACING.spacing12}
          gridGap={SPACING.spacing12}
        >
          <Flex justifyContent={JUSTIFY_CENTER} width="100%">
            <Flex
              width="39.4275rem"
              height="32.125rem"
              justifyContent={JUSTIFY_CENTER}
              alignItems={ALIGN_CENTER}
              borderRadius={BORDERS.borderRadius8}
              backgroundColor={COLORS.grey20}
            >
              <Flex
                padding={SPACING.spacing60}
                width="100%"
                height="100%"
                flexDirection={DIRECTION_COLUMN}
              >
                <Flex
                  justifyContent={JUSTIFY_CENTER}
                  width="100%"
                  color={COLORS.grey60}
                  marginBottom={SPACING.spacing40}
                >
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {i18n.format(t('off_deck_labware'), 'upperCase')}
                  </StyledText>
                </Flex>
                <Flex
                  width="510.84px"
                  height="342px"
                  alignItems="center"
                  justifyContent="center"
                >
                  {labware}
                </Flex>
              </Flex>
            </Flex>
          </Flex>
          <DeckSetupTools
            position={POSITION_RELATIVE}
            onDeckProps={null}
            setHoveredLabware={setHoveredLabware}
            onCloseClick={() => {
              dispatch(selectZoomedIntoSlot({ slot: null, cutout: null }))
            }}
          />
        </Flex>
      ) : (
        <OffDeckDetails
          tab={tab}
          addLabware={() => {
            dispatch(selectZoomedIntoSlot({ slot: 'offDeck', cutout: null }))
          }}
        />
      )}
    </Flex>
  )
}
