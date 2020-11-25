// @flow
import * as React from 'react'
import { useTranslation, Trans } from 'react-i18next'

import {
  SecondaryBtn,
  Link,
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING_3,
} from '@opentrons/components'
import { useTrackEvent } from '../../analytics'
import { LabeledValue } from '../structure'

const EVENT_JUPYTER_OPEN = { name: 'jupyterOpen', properties: {} }

export type OpenJupyterControlProps = {|
  robotIp: string,
|}

export function OpenJupyterControl(props: OpenJupyterControlProps): React.Node {
  const { robotIp } = props
  const { t } = useTranslation()
  const href = `http://${robotIp}:48888`
  const trackEvent = useTrackEvent()

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      padding={SPACING_3}
    >
      <LabeledValue
        label={t('robot_settings.advanced.open_jupyter_label')}
        value={
          <Trans
            i18nKey="robot_settings.advanced.open_jupyter_description"
            components={{
              jn: <Link external href="https://jupyter.org/" />,
              docs: (
                <Link
                  external
                  href="https://docs.opentrons.com/v2/new_advanced_running.html#jupyter-notebook"
                />
              ),
            }}
          />
        }
      />
      <SecondaryBtn
        onClick={() => trackEvent(EVENT_JUPYTER_OPEN)}
        as={Link}
        href={href}
        width="9rem"
        external
      >
        {t('button.open')}
      </SecondaryBtn>
    </Flex>
  )
}
