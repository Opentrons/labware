import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import last from 'lodash/last'

import { GET, request } from '@opentrons/api-client'
import {
  ALIGN_CENTER,
  ALIGN_END,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING_AUTO,
  ERROR_TOAST,
  INFO_TOAST,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { useHost } from '@opentrons/react-api-client'

import { TertiaryButton } from '/app/atoms/buttons'
import { useToaster } from '/app/organisms/ToasterOven'
import { CONNECTABLE } from '/app/redux/discovery'
import { useRobot } from '/app/redux-resources/robots'

import type { MouseEventHandler } from 'react'
import type { IconProps } from '@opentrons/components'

interface TroubleshootingProps {
  robotName: string
}

export function Troubleshooting({
  robotName,
}: TroubleshootingProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const robot = useRobot(robotName)
  const controlDisabled = robot?.status !== CONNECTABLE
  const logsAvailable = robot?.health?.logs != null
  const [isDownloadingRobotLogs, setIsDownloadingRobotLogs] = useState<boolean>(
    false
  )
  const { makeToast, eatToast } = useToaster()
  const toastIcon: IconProps = { name: 'ot-spinner', spin: true }

  const host = useHost()

  const handleClick: MouseEventHandler<HTMLButtonElement> = () => {
    setIsDownloadingRobotLogs(true)
    const toastId = makeToast(t('downloading_logs') as string, INFO_TOAST, {
      disableTimeout: true,
      icon: toastIcon,
    })

    if (
      !controlDisabled &&
      robot?.status === CONNECTABLE &&
      robot.health.logs != null &&
      host != null
    ) {
      const zip = new JSZip()

      Promise.all(
        robot.health.logs.map(log => {
          const logFileName: string = last(log.split('/')) ?? 'opentrons.log'
          return request<string>(GET, log, null, host)
            .then(res => {
              zip.file(logFileName, res.data)
            })
            .catch((e: Error) =>
              makeToast(e?.message, ERROR_TOAST, { closeButton: true })
            )
        })
      )
        .then(() => {
          zip
            .generateAsync({ type: 'blob' })
            .then(blob => {
              saveAs(blob, `${robotName}_logs.zip`)
            })
            .catch((e: Error) => {
              eatToast(toastId)
              makeToast(e?.message, ERROR_TOAST, { closeButton: true })
              // avoid no-op on unmount
              if (mounted.current != null) setIsDownloadingRobotLogs(false)
            })
        })
        .then(() => {
          eatToast(toastId)
          if (mounted.current != null) setIsDownloadingRobotLogs(false)
        })
        .catch((e: Error) => {
          eatToast(toastId)
          makeToast(e?.message, ERROR_TOAST, { closeButton: true })
          if (mounted.current != null) setIsDownloadingRobotLogs(false)
        })
    }
  }

  // set ref on component to check if component is mounted https://dev/reference/react/useRef#manipulating-the-dom-with-a-ref
  const mounted = useRef(null)

  return (
    <Flex
      ref={mounted}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginTop={SPACING.spacing24}
    >
      <Box width="70%">
        <LegacyStyledText
          as="h3"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          marginBottom={SPACING.spacing20}
        >
          {t('troubleshooting')}
        </LegacyStyledText>
        <LegacyStyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          data-testid="RobotSettings_Troubleshooting"
        >
          {t('download_logs')}
        </LegacyStyledText>
      </Box>
      <TertiaryButton
        disabled={
          controlDisabled || logsAvailable == null || isDownloadingRobotLogs
        }
        marginLeft={SPACING_AUTO}
        onClick={handleClick}
        id="AdvancedSettings_downloadLogsButton"
        alignSelf={ALIGN_END}
      >
        {t('download_logs')}
      </TertiaryButton>
    </Flex>
  )
}
