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
const VIEW_BOX = `-25 -32 182.5142857143 122.1142857143`
const OFF_DECK_CONTAINER_WIDTH = '39.4275rem'
const OFF_DECK_CONTAINER_HEIGHT = '32.125rem'
const SIZE_ADJUSTMENT = 0.7

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

  // let labware = (
  //   <RobotWorkSpace key="emptyState" viewBox={VIEW_BOX}>
  //     {() => (
  //       <RobotCoordsForeignDiv>
  //         <Box
  //           backgroundColor={COLORS.grey40}
  //           borderRadius={BORDERS.borderRadius8}
  //           width={STANDARD_X_WIDTH}
  //           height={STANDARD_Y_HEIGHT}
  //         />
  //       </RobotCoordsForeignDiv>
  //     )}
  //   </RobotWorkSpace>
  // )

  let labware = (
    <RobotWorkSpace key="emptyState" viewBox={VIEW_BOX}>
      {() => (
        <RobotCoordsForeignDiv
          x={-25}
          y={-32}
          innerDivProps={{
            style: {
              width: '100%',
              height: '100%',
              backgroundColor: COLORS.grey40,
              borderRadius: BORDERS.borderRadius8,
            },
          }}
        />
      )}
    </RobotWorkSpace>
  )

  console.log(hoveredLabwareDef?.dimensions)

  if (hoveredLabwareDef != null && hoveredLabwareDef !== offDeckLabware) {
    labware = (
      <RobotWorkSpace
        key={hoveredLabwareDef.parameters.loadName}
        viewBox={`-25 -32 ${
          hoveredLabwareDef.dimensions.xDimension / SIZE_ADJUSTMENT
        } ${hoveredLabwareDef.dimensions.yDimension / SIZE_ADJUSTMENT}`}
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

    console.log('offDeckLabware', offDeckLabware)
    labware = (
      <RobotWorkSpace
        key={def.parameters.loadName}
        viewBox={`-25 -32 ${def.dimensions.xDimension / SIZE_ADJUSTMENT} ${
          def.dimensions.yDimension / SIZE_ADJUSTMENT
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

  console.log('selectedSlot', selectedSlot)

  return (
    <Flex width="100%">
      {selectedSlot.slot === 'offDeck' ? (
        <Flex
          alignItems={ALIGN_CENTER}
          width="100%"
          gridGap={SPACING.spacing10}
        >
          <Flex justifyContent={JUSTIFY_CENTER} width="100%">
            <Flex
              width={OFF_DECK_CONTAINER_WIDTH}
              height={OFF_DECK_CONTAINER_HEIGHT}
              justifyContent={JUSTIFY_CENTER}
              alignItems={ALIGN_CENTER}
              borderRadius={BORDERS.borderRadius8}
              backgroundColor={COLORS.white}
              id="whiteBox"
              padding={`${SPACING.spacing40} ${SPACING.spacing60} ${SPACING.spacing80}`}
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing32}
            >
              <StyledText desktopStyle="bodyDefaultSemiBold">
                {i18n.format(t('off_deck_labware'), 'upperCase')}
              </StyledText>
              <Flex width="100%" height="100%">
                {labware}
              </Flex>
            </Flex>
          </Flex>
          <Flex padding={SPACING.spacing12}>
            <DeckSetupTools
              position={POSITION_RELATIVE}
              onDeckProps={null}
              setHoveredLabware={setHoveredLabware}
              onCloseClick={() => {
                dispatch(selectZoomedIntoSlot({ slot: null, cutout: null }))
              }}
            />
          </Flex>
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
