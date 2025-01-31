import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_AROUND,
  JUSTIFY_SPACE_BETWEEN,
  OVERFLOW_WRAP_ANYWHERE,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { getIsOnDevice } from '/app/redux/config'
import { Divider } from '/app/atoms/structure'
import { labwareImages } from '/app/local-resources/labware'
import { equipmentImages } from './equipmentImages'

import type { ComponentProps } from 'react'
import type { StyleProps } from '@opentrons/components'
interface WizardRequiredEquipmentListProps extends StyleProps {
  equipmentList: Array<ComponentProps<typeof RequiredEquipmentCard>>
  footer?: string
}
export function WizardRequiredEquipmentList(
  props: WizardRequiredEquipmentListProps
): JSX.Element {
  const { t } = useTranslation('robot_calibration')
  const { equipmentList, footer } = props
  const isOnDevice = useSelector(getIsOnDevice)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width={props.width ?? SPACING.spacingAuto}
    >
      {isOnDevice ? (
        <>
          <LegacyStyledText
            fontSize="1.25rem"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            lineHeight="1.5rem"
            marginBottom={SPACING.spacing8}
          >
            {t('you_will_need')}
          </LegacyStyledText>
          <Flex
            backgroundColor="#16212D33"
            flexDirection={DIRECTION_COLUMN}
            borderRadius={BORDERS.borderRadius8}
            width="428px"
          >
            {equipmentList.map((requiredEquipmentProps, index) => (
              <Box
                paddingX={SPACING.spacing20}
                paddingY={SPACING.spacing4}
                key={`${index}_${requiredEquipmentProps.loadName}`}
              >
                <LegacyStyledText
                  fontSize={TYPOGRAPHY.fontSize20}
                  paddingY={SPACING.spacing12}
                  overflowWrap={OVERFLOW_WRAP_ANYWHERE}
                >
                  {requiredEquipmentProps.displayName}
                </LegacyStyledText>
                {/* do not show divider after the last equipment in the list */}
                {index + 1 === Object.keys(equipmentList).length ? null : (
                  <Box
                    borderBottom={`1px solid ${COLORS.black90}${COLORS.opacity20HexCode}`}
                  />
                )}
              </Box>
            ))}
          </Flex>
        </>
      ) : (
        <>
          <LegacyStyledText
            as="h3"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            marginBottom={SPACING.spacing8}
          >
            {t('you_will_need')}
          </LegacyStyledText>
          <Divider />
          {equipmentList.map(requiredEquipmentProps => (
            <RequiredEquipmentCard
              key={requiredEquipmentProps.loadName}
              {...requiredEquipmentProps}
            />
          ))}
          {footer != null ? (
            <LegacyStyledText
              marginTop={SPACING.spacing8}
              as="label"
              color={COLORS.grey60}
            >
              {footer}
            </LegacyStyledText>
          ) : null}
        </>
      )}
    </Flex>
  )
}

interface RequiredEquipmentCardProps {
  loadName: string
  displayName: string
  subtitle?: string
  bottomDivider?: boolean
}

function RequiredEquipmentCard(props: RequiredEquipmentCardProps): JSX.Element {
  const { loadName, displayName, subtitle, bottomDivider = true } = props

  let imageSrc: string | null = null
  if (loadName in labwareImages) {
    imageSrc = labwareImages[loadName as keyof typeof labwareImages]
  } else if (loadName in equipmentImages) {
    imageSrc = equipmentImages[loadName as keyof typeof equipmentImages]
  }

  return (
    <>
      <Flex
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
        width="100%"
      >
        {imageSrc != null ? (
          <Flex
            height={loadName in equipmentImages ? '3.5rem' : '6rem'}
            flex="0 1 30%"
            justifyContent={JUSTIFY_CENTER}
            alignItems={ALIGN_CENTER}
            marginRight={SPACING.spacing16}
          >
            <img
              css={css`
                max-width: 100%;
                max-height: 100%;
                flex: ${loadName in equipmentImages ? `0` : `0 1 5rem`};
                display: block;
              `}
              src={imageSrc}
              alt={displayName}
            />
          </Flex>
        ) : null}
        <Flex
          flex={imageSrc == null ? '0 1 100%' : '0 1 70%'}
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_SPACE_AROUND}
        >
          <LegacyStyledText as="p">{displayName}</LegacyStyledText>
          {subtitle != null ? (
            <LegacyStyledText as="p" color={COLORS.grey50}>
              {subtitle}
            </LegacyStyledText>
          ) : null}
        </Flex>
      </Flex>
      {bottomDivider ? <Divider /> : null}
    </>
  )
}
