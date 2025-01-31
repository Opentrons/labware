import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useHoverTooltip,
  Tooltip,
  ListButton,
  StyledText,
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  COLORS,
  Icon,
  ALIGN_CENTER,
} from '@opentrons/components'
import { WellOrderModal } from '../../../../../organisms'
import type { WellOrderOption } from '../../../../../form-types'
import type { FieldProps } from '../types'

export interface WellsOrderFieldProps {
  prefix: 'aspirate' | 'dispense' | 'mix'
  firstName: string
  secondName: string
  updateFirstWellOrder: FieldProps['updateValue']
  updateSecondWellOrder: FieldProps['updateValue']
  firstValue?: WellOrderOption | null
  secondValue?: WellOrderOption | null
  padding?: string
}

export function WellsOrderField(props: WellsOrderFieldProps): JSX.Element {
  const {
    firstValue,
    secondValue,
    firstName,
    secondName,
    prefix,
    updateFirstWellOrder,
    updateSecondWellOrder,
    padding = `0 ${SPACING.spacing16}`,
  } = props
  const { t, i18n } = useTranslation(['form', 'modal', 'protocol_steps'])
  const [isModalOpen, setModalOpen] = useState(false)

  const handleOpen = (): void => {
    setModalOpen(true)
  }
  const handleClose = (): void => {
    setModalOpen(false)
  }

  const updateValues = (firstValue: unknown, secondValue: unknown): void => {
    updateFirstWellOrder(firstValue)
    updateSecondWellOrder(secondValue)
  }

  const [targetProps, tooltipProps] = useHoverTooltip()

  return (
    <>
      <Tooltip tooltipProps={tooltipProps}>
        {t('step_edit_form.field.well_order.label')}
      </Tooltip>
      <Flex
        {...targetProps}
        padding={padding}
        gridGap={SPACING.spacing8}
        flexDirection={DIRECTION_COLUMN}
      >
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
          {i18n.format(
            t('protocol_steps:well_order_title', { prefix }),
            'capitalize'
          )}
        </StyledText>
        <ListButton
          onClick={handleOpen}
          type="noActive"
          width="100%"
          padding={SPACING.spacing12}
          gridGap={SPACING.spacing8}
          alignItems={ALIGN_CENTER}
        >
          <Icon name="well-order" size="1.25rem" />
          <StyledText desktopStyle="bodyDefaultRegular">
            {`${t(`step_edit_form.field.well_order.option.${firstValue}`)}, ${t(
              `step_edit_form.field.well_order.option.${secondValue}`
            )}`}
          </StyledText>
        </ListButton>
      </Flex>
      <WellOrderModal
        prefix={prefix}
        closeModal={handleClose}
        isOpen={isModalOpen}
        updateValues={updateValues}
        firstValue={firstValue}
        secondValue={secondValue}
        firstName={firstName}
        secondName={secondName}
      />
    </>
  )
}
