import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  ALIGN_CENTER,
  Box,
  Btn,
  Flex,
  Icon,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { HTMLProps } from 'react'

// TODO(bh, 2022-12-7): finish styling when designs finalized
export function BackButton({
  onClick,
  children,
}: HTMLProps<HTMLButtonElement>): JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation('shared')

  return (
    <Btn
      marginBottom="1rem"
      maxWidth="fit-content"
      // go back in the history stack if no click handler specified
      onClick={
        onClick != null
          ? onClick
          : () => {
              navigate(-1)
            }
      }
    >
      <Flex alignItems={ALIGN_CENTER}>
        <Icon name="back" height="3rem" />
        <Box fontSize="2rem" fontWeight={TYPOGRAPHY.fontWeightBold}>
          {/* render "Back" if no children given */}
          {children != null ? children : t('back')}
        </Box>
      </Flex>
    </Btn>
  )
}
