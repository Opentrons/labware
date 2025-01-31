import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  Btn,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  JUSTIFY_END,
  JUSTIFY_SPACE_BETWEEN,
  Modal,
  PrimaryButton,
  SPACING,
  SecondaryButton,
  StyledText,
} from '@opentrons/components'
import { DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP } from '../../constants'
import { getIsTouchTipField } from '../../form-types'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { getMainPagePortalEl } from '../Portal'
import * as utils from './utils'
import { TOO_MANY_DECIMALS } from './constants'
import { TipPositionZOnlyView } from './TipPositionZOnlyView'

import type { ChangeEvent } from 'react'
import type { StepFieldName } from '../../form-types'

interface ZTipPositionModalProps {
  closeModal: () => void
  zValue: number | null
  name: StepFieldName
  updateValue: (val?: number | null) => void
  wellDepthMm: number
  isIndeterminate?: boolean
}

export function ZTipPositionModal(props: ZTipPositionModalProps): JSX.Element {
  const {
    isIndeterminate,
    name,
    wellDepthMm,
    zValue,
    closeModal,
    updateValue,
  } = props
  const { t } = useTranslation(['modal', 'button'])

  const isBlowout = name === 'blowout_z_offset'
  const defaultMm = isBlowout
    ? 0
    : utils.getDefaultMmFromBottom({
        name,
        wellDepthMm,
      })

  const [value, setValue] = useState<string | null>(
    zValue !== null ? String(zValue) : null
  )

  // in this modal, pristinity hides the OUT_OF_BOUNDS error only.
  const [isPristine, setPristine] = useState<boolean>(true)

  const getMinMaxMmFromBottom = (): {
    maxMmFromBottom: number
    minMmFromBottom: number
  } => {
    if (getIsTouchTipField(name)) {
      return {
        maxMmFromBottom: utils.roundValue(wellDepthMm, 'up'),
        minMmFromBottom: utils.roundValue(wellDepthMm / 2, 'up'),
      }
    }
    return {
      maxMmFromBottom: utils.roundValue(wellDepthMm, 'up'),
      minMmFromBottom: 0,
    }
  }
  const { maxMmFromBottom, minMmFromBottom } = getMinMaxMmFromBottom()

  //    For blowout from the top of the well
  const minFromTop = DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP
  const maxFromTop = -wellDepthMm

  const minMm = isBlowout ? maxFromTop : minMmFromBottom
  const maxMm = isBlowout ? minFromTop : maxMmFromBottom

  const errors = utils.getErrors({
    minMm,
    maxMm,
    value,
  })
  const hasErrors = errors.length > 0
  const hasVisibleErrors = isPristine
    ? errors.includes(TOO_MANY_DECIMALS)
    : hasErrors

  const errorText = utils.getErrorText({
    errors,
    minMm,
    maxMm,
    isPristine,
    t,
  })

  const handleDone = (): void => {
    if (!hasErrors) {
      updateValue(value == null ? null : Number(value))
      closeModal()
    }
  }

  const handleCancel = (): void => {
    closeModal()
  }

  const handleChange = (newValueRaw: string | number): void => {
    // if string, strip non-number characters from string and cast to number
    const newValue =
      typeof newValueRaw === 'string'
        ? newValueRaw.replace(/[^-.0-9]/, '')
        : String(newValueRaw)

    if (newValue === '.') {
      setValue('0.')
    } else if (newValue === '-0') {
      setValue('0')
    } else {
      isBlowout
        ? setValue(newValue)
        : setValue(Number(newValue) >= 0 ? newValue : '0')
    }
  }

  const handleInputFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
    handleChange(e.currentTarget.value)
    setPristine(false)
  }

  return createPortal(
    <Modal
      marginLeft="0"
      type="info"
      width="37.125rem"
      closeOnOutsideClick
      title={t(`shared:tip_position_${name}`)}
      onClose={handleCancel}
      footer={
        <Flex
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          padding={SPACING.spacing24}
          alignItems={ALIGN_CENTER}
        >
          <Btn
            onClick={() => {
              setValue(utils.roundValue(defaultMm, 'up').toString())
            }}
            css={LINK_BUTTON_STYLE}
          >
            {t('shared:reset_to_default')}
          </Btn>
          <Flex gridGap={SPACING.spacing8} justifyContent={JUSTIFY_END}>
            <SecondaryButton onClick={handleCancel}>
              {t('shared:cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={handleDone} disabled={hasVisibleErrors}>
              {t('shared:save')}
            </PrimaryButton>
          </Flex>
        </Flex>
      }
    >
      <Flex gridGap={SPACING.spacing40}>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t(`tip_position.body.${name}`)}
          </StyledText>
          <InputField
            title={t('tip_position.field_titles.z_position')}
            caption={t('tip_position.caption', {
              min: minMm,
              max: maxMm,
            })}
            error={errorText}
            id="TipPositionModal_custom_input"
            isIndeterminate={value === null && isIndeterminate}
            onChange={handleInputFieldChange}
            units={t('application:units.millimeter')}
            value={value !== null ? String(value) : ''}
          />
        </Flex>
        <Flex>
          <TipPositionZOnlyView
            mmFromBottom={
              isBlowout ? undefined : value !== null ? Number(value) : defaultMm
            }
            mmFromTop={
              isBlowout
                ? value !== null
                  ? Number(value)
                  : defaultMm
                : undefined
            }
            wellDepthMm={wellDepthMm}
          />
        </Flex>
      </Flex>
    </Modal>,
    getMainPagePortalEl()
  )
}
