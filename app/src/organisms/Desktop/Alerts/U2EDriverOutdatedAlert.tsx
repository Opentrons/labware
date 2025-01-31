import { Link as InternalLink } from 'react-router-dom'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  AlertModal,
  DeprecatedCheckboxField,
  Link,
  useToggle,
} from '@opentrons/components'
import {
  useTrackEvent,
  ANALYTICS_U2E_DRIVE_ALERT_DISMISSED,
  ANALYTICS_U2E_DRIVE_LINK_CLICKED,
} from '/app/redux/analytics'
import { U2E_DRIVER_UPDATE_URL } from '/app/redux/system-info'
import type { AlertProps } from './types'

const ADAPTER_INFO_URL = '/more/network-and-system'

const LinkButton = styled(Link)`
  width: auto;
  padding-left: 1rem;
  padding-right: 1rem;
`

const IgnoreCheckbox = styled(DeprecatedCheckboxField)`
  position: absolute;
  left: 1rem;
  bottom: 1.5rem;
`

export function U2EDriverOutdatedAlert(props: AlertProps): JSX.Element {
  const trackEvent = useTrackEvent()
  const { t } = useTranslation(['app_settings', 'branded'])
  const [rememberDismiss, toggleRememberDismiss] = useToggle()
  const { dismissAlert } = props

  return (
    <AlertModal
      alertOverlay
      heading={t('driver_out_of_date')}
      buttons={[
        {
          Component: LinkButton,
          as: InternalLink,
          to: ADAPTER_INFO_URL,
          children: t('view_adapter_info'),
          onClick: () => {
            dismissAlert(rememberDismiss)
            trackEvent({
              name: ANALYTICS_U2E_DRIVE_ALERT_DISMISSED,
              properties: { rememberDismiss },
            })
          },
        },
        {
          Component: LinkButton,
          href: U2E_DRIVER_UPDATE_URL,
          external: true,
          children: t('get_update'),
          onClick: () => {
            dismissAlert(rememberDismiss)
            trackEvent({
              name: ANALYTICS_U2E_DRIVE_LINK_CLICKED,
              properties: { source: 'modal' },
            })
          },
        },
      ]}
    >
      <p>
        {t('u2e_driver_outdated_message')} {t('branded:u2e_driver_description')}
      </p>
      <p>{t('please_update_driver')}</p>
      <IgnoreCheckbox
        label={t('dont_remind_me')}
        value={rememberDismiss}
        onChange={toggleRememberDismiss}
      />
    </AlertModal>
  )
}
