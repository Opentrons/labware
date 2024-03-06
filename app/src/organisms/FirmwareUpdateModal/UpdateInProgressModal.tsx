import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Icon,
  Flex,
  SPACING,
  TYPOGRAPHY,
  RESPONSIVENESS,
} from '@opentrons/components'
import { StyledText } from '../../atoms/text'
import { Modal } from '../../molecules/Modal'
import type { Subsystem } from '@opentrons/api-client'

interface UpdateInProgressModalProps {
  subsystem: Subsystem
}

const SPINNER_STYLE = css`
  color: ${COLORS.grey50};
  opacity: 100%;
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    color: ${COLORS.black90};
    opacity: 70%;
  }
`

export function UpdateInProgressModal(
  props: UpdateInProgressModalProps
): JSX.Element {
  const { subsystem } = props
  const { t } = useTranslation('firmware_update')

  return (
    <Modal>
      <Flex
        height="17.25rem"
        width="100%"
        backgroundColor={COLORS.grey35}
        borderRadius={BORDERS.borderRadiusSize3}
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing32}
        justifyContent={ALIGN_CENTER}
        alignItems={ALIGN_CENTER}
        gridGap={SPACING.spacing40}
      >
        <StyledText
          as="h4"
          marginBottom={SPACING.spacing4}
          fontWeight={TYPOGRAPHY.fontWeightBold}
        >
          {t('updating_firmware', { subsystem: t(subsystem) })}
        </StyledText>
        <Icon
          name="ot-spinner"
          aria-label="spinner"
          size="6.25rem"
          css={SPINNER_STYLE}
          spin
        />
      </Flex>
    </Modal>
  )
}
