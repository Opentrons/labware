import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InstrumentDiagram,
  JUSTIFY_CENTER,
  LegacyStyledText,
  OverflowBtn,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  SPACING,
  TYPOGRAPHY,
  useMenuHandleClickOutside,
} from '@opentrons/components'
import flexGripper from '/app/assets/images/flex_gripper.png'

import { MenuOverlay } from './MenuOverlay'

import type { ReactNode } from 'react'
import type { InstrumentDiagramProps, StyleProps } from '@opentrons/components'
import type { MenuOverlayItemProps } from './MenuOverlay'

interface InstrumentCardProps extends StyleProps {
  description: string
  label: string
  menuOverlayItems?: MenuOverlayItemProps[]
  hasDivider?: boolean
  instrumentDiagramProps?: InstrumentDiagramProps
  // special casing the gripper at least for now
  isGripperAttached?: boolean
  banner?: ReactNode
  isEstopNotDisengaged: boolean
}

/**
 * a component for a gripper or pipette instrument
 * TODO(bh, 2022-10-26): explore adding banner section, using within PipetteCard component
 */
export function InstrumentCard(props: InstrumentCardProps): JSX.Element {
  const {
    description,
    hasDivider = false,
    instrumentDiagramProps,
    isGripperAttached = false,
    label,
    menuOverlayItems,
    banner,
    isEstopNotDisengaged,
    ...styleProps
  } = props

  const {
    menuOverlay,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  } = useMenuHandleClickOutside()

  return (
    <Flex
      alignItems={ALIGN_FLEX_START}
      backgroundColor={COLORS.grey10}
      borderRadius={BORDERS.borderRadius8}
      gridGap={SPACING.spacing8}
      padding={SPACING.spacing16}
      position={POSITION_RELATIVE}
      {...styleProps}
    >
      {isGripperAttached ? (
        <Flex justifyContent={JUSTIFY_CENTER} width="3.75rem" height="3.375rem">
          <img
            src={flexGripper}
            alt="Flex Gripper"
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </Flex>
      ) : null}
      {instrumentDiagramProps?.pipetteSpecs != null ? (
        <Flex
          alignItems={ALIGN_CENTER}
          width="3.75rem"
          height="3.375rem"
          paddingRight={SPACING.spacing8}
        >
          <InstrumentDiagram
            pipetteSpecs={instrumentDiagramProps.pipetteSpecs}
            mount={instrumentDiagramProps.mount}
            transform="scale(0.3)"
            transformOrigin="-5% 52%"
          />
        </Flex>
      ) : null}
      <Flex
        alignItems={ALIGN_FLEX_START}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing2}
        paddingRight={SPACING.spacing24}
        width="100%"
      >
        {banner}
        <LegacyStyledText
          textTransform={TYPOGRAPHY.textTransformUppercase}
          color={COLORS.grey50}
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          fontSize={TYPOGRAPHY.fontSizeH6}
        >
          {label}
        </LegacyStyledText>
        <LegacyStyledText as="p">{description}</LegacyStyledText>
      </Flex>
      {menuOverlayItems != null && (
        <Box
          position={POSITION_ABSOLUTE}
          top={SPACING.spacing4}
          right={SPACING.spacing4}
        >
          <OverflowBtn
            onClick={handleOverflowClick}
            aria-label="InstrumentCard_overflowMenu"
            disabled={isEstopNotDisengaged}
          />
          {menuOverlay}
          {showOverflowMenu ? (
            <MenuOverlay
              hasDivider={hasDivider}
              menuOverlayItems={menuOverlayItems}
              setShowMenuOverlay={setShowOverflowMenu}
            />
          ) : null}
        </Box>
      )}
    </Flex>
  )
}
