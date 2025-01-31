import { Fragment } from 'react'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  SIZE_1,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { getIsOnDevice } from '/app/redux/config'

import type { StyleProps } from '@opentrons/components'

interface OffsetVectorProps extends StyleProps {
  x: number
  y: number
  z: number
}

export function LiveOffsetValue(props: OffsetVectorProps): JSX.Element {
  const { x, y, z, ...styleProps } = props
  const axisLabels = ['X', 'Y', 'Z']
  const { i18n, t } = useTranslation('labware_position_check')
  const isOnDevice = useSelector(getIsOnDevice)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      marginY={SPACING.spacing8}
      gridGap={SPACING.spacing4}
    >
      <LegacyStyledText
        as="label"
        fontWeight={
          isOnDevice
            ? TYPOGRAPHY.fontWeightRegular
            : TYPOGRAPHY.fontWeightSemiBold
        }
      >
        {i18n.format(t('labware_offset_data'), 'capitalize')}
      </LegacyStyledText>
      <Flex
        alignItems={ALIGN_CENTER}
        border={`${BORDERS.styleSolid} 1px ${COLORS.grey30}`}
        borderRadius={BORDERS.borderRadius4}
        padding={SPACING.spacing8}
        {...styleProps}
      >
        <Icon name="reticle" size={isOnDevice ? '1.5rem' : SIZE_1} />
        {[x, y, z].map((axis, index) => (
          <Fragment key={index}>
            <LegacyStyledText
              as="p"
              marginLeft={SPACING.spacing8}
              marginRight={SPACING.spacing4}
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            >
              {axisLabels[index]}
            </LegacyStyledText>
            <LegacyStyledText as="p">{axis.toFixed(1)}</LegacyStyledText>
          </Fragment>
        ))}
      </Flex>
    </Flex>
  )
}
