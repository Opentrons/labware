import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePipettesQuery } from '@opentrons/react-api-client'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_ROW,
  Flex,
  Icon,
  PrimaryButton,
  SIZE_1,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import { DETACH } from './constants'

import type { ReactNode } from 'react'

export interface CheckPipetteButtonProps {
  robotName: string
  children?: ReactNode
  direction?: 'detach' | 'attach'
  onDone?: () => void
}

export function CheckPipettesButton(
  props: CheckPipetteButtonProps
): JSX.Element | null {
  const { onDone, children, direction } = props
  const { t } = useTranslation('change_pipette')
  const [isPending, setIsPending] = useState(false)
  const { refetch: refetchPipettes } = usePipettesQuery(
    { refresh: true },
    {
      enabled: false,
      onSettled: () => {
        setIsPending(false)
      },
    }
  )
  const handleClick = (): void => {
    setIsPending(true)
    refetchPipettes()
      .then(() => {
        onDone?.()
      })
      .catch(() => {})
  }
  const icon = (
    <Icon name="ot-spinner" height="1rem" spin marginRight={SPACING.spacing8} />
  )

  let body
  if (children != null && !isPending) {
    body = children
  } else if (children != null && isPending) {
    body = (
      <>
        {icon}
        {children}
      </>
    )
  } else if (children == null && isPending) {
    body = (
      <>
        <Icon
          name="ot-spinner"
          height={SIZE_1}
          spin
          marginRight={SPACING.spacing8}
        />
        <LegacyStyledText>
          {direction === DETACH
            ? t('confirming_detachment')
            : t('confirming_attachment')}
        </LegacyStyledText>
      </>
    )
  } else if (children == null && !isPending) {
    body =
      direction === DETACH ? t('confirm_detachment') : t('confirm_attachment')
  }

  return (
    <PrimaryButton
      onClick={handleClick}
      aria-label="Confirm"
      disabled={isPending}
    >
      <Flex
        flexDirection={DIRECTION_ROW}
        color={COLORS.white}
        alignItems={ALIGN_CENTER}
      >
        {body}
      </Flex>
    </PrimaryButton>
  )
}
