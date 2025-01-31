import { useTranslation } from 'react-i18next'

import type { AlertLevel } from './types'

interface WarningContentsProps {
  warningType: string
  level: AlertLevel
}
export function WarningContents(
  props: WarningContentsProps
): JSX.Element | null {
  const { warningType, level } = props
  const { t } = useTranslation('alert')

  if (level === 'timeline') {
    switch (warningType) {
      case 'ASPIRATE_FROM_PRISTINE_WELL':
        return (
          <>
            {t(`timeline.warning.${warningType}.body`, {
              defaultValue: '',
            })}
          </>
        )
      default:
        return t(`timeline.warning.${warningType}.body`, {
          defaultValue: '',
        })
    }
  } else if (props.level === 'form') {
    return t(`form.warning.${warningType}.body`, {
      defaultValue: '',
    })
  } else {
    return null
  }
}
