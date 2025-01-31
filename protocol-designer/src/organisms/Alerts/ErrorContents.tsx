import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  Btn,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { LINK_BUTTON_STYLE } from '../../atoms'
import { selectDesignerTab } from '../../file-data/actions'

import type { AlertLevel } from './types'

interface ErrorContentsProps {
  errorType: string
  level: AlertLevel
}
export const ErrorContents = (
  props: ErrorContentsProps
): JSX.Element | null => {
  const { errorType, level } = props
  const { t } = useTranslation(['alert', 'shared'])
  const dispatch = useDispatch()

  if (level === 'timeline') {
    const bodyText = t(`timeline.error.${errorType}.body`, {
      defaultValue: '',
    })
    switch (errorType) {
      case 'INSUFFICIENT_TIPS':
        return (
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            gridGap={SPACING.spacing8}
          >
            {bodyText}
            <Btn
              width="7.25rem"
              textDecoration={TYPOGRAPHY.textDecorationUnderline}
              css={LINK_BUTTON_STYLE}
              onClick={() => {
                dispatch(selectDesignerTab({ tab: 'startingDeck' }))
              }}
            >
              {t(`timeline.error.${errorType}.link`)}
            </Btn>
          </Flex>
        )
      case 'REMOVE_96_CHANNEL_TIPRACK_ADAPTER':
      case 'MISSING_96_CHANNEL_TIPRACK_ADAPTER':
        return (
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            gridGap={SPACING.spacing8}
          >
            {t(`timeline.error.${errorType}.body`)}
            <Btn
              width="7.25rem"
              textDecoration={TYPOGRAPHY.textDecorationUnderline}
              css={LINK_BUTTON_STYLE}
              onClick={() => {
                dispatch(selectDesignerTab({ tab: 'startingDeck' }))
              }}
            >
              {t(`timeline.error.${errorType}.link`)}
            </Btn>
          </Flex>
        )
      default:
        return bodyText
    }
  } else if (level === 'form') {
    return t(`form.error.${errorType}.body`, {
      defaultValue: '',
    })
  } else {
    return null
  }
}
