import { Slideout } from '../../../atoms/Slideout'
import { StyledText } from '../../../atoms/text'
import type { AttachedPipette } from '../../../redux/pipettes/types'
import {
  Flex,
  DIRECTION_COLUMN,
  SPACING,
  PrimaryButton,
  TYPOGRAPHY,
  COLORS,
} from '@opentrons/components'
import type { PipetteModelSpecs } from '@opentrons/shared-data'
import * as React from 'react'
import { useTranslation } from 'react-i18next'

interface AboutPipetteSlideoutProps {
  pipetteId: AttachedPipette['id']
  pipetteName: PipetteModelSpecs['displayName']
  onCloseClick: () => unknown
  isExpanded: boolean
}

export const AboutPipetteSlideout = (
  props: AboutPipetteSlideoutProps
): JSX.Element | null => {
  const { pipetteId, pipetteName, isExpanded, onCloseClick } = props
  const { t } = useTranslation(['device_details', 'shared'])

  return (
    <Slideout
      title={t('about_pipette_name', { name: pipetteName })}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <PrimaryButton
          onClick={onCloseClick}
          width="100%"
          textTransform={TYPOGRAPHY.textTransformCapitalize}
          data-testid="AboutPipette_slideout_close"
        >
          {t('shared:close')}
        </PrimaryButton>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText
          as="h6"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          color={COLORS.darkGreyEnabled}
          data-testid={`AboutPipetteSlideout_serial_number_text_${pipetteId}`}
          textTransform={TYPOGRAPHY.textTransformUppercase}
        >
          {t('serial_number')}
        </StyledText>
        <StyledText
          as="p"
          paddingTop={SPACING.spacing4}
          data-testid={`AboutPipetteSlideout_serial_${pipetteId}`}
        >
          {pipetteId}
        </StyledText>
      </Flex>
    </Slideout>
  )
}
