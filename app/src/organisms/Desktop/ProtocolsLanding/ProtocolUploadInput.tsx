import { useTranslation, Trans } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  ERROR_TOAST,
  Flex,
  Link,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import { UploadInput } from '/app/molecules/UploadInput'
import { addProtocol } from '/app/redux/protocol-storage'
import {
  useTrackEvent,
  ANALYTICS_IMPORT_PROTOCOL_TO_APP,
} from '/app/redux/analytics'
import { useLogger } from '/app/logger'
import { useToaster } from '/app/organisms/ToasterOven'
import { remote } from '/app/redux/shell/remote'

import type { Dispatch } from '/app/redux/types'

export interface UploadInputProps {
  onUpload?: () => void
}

const isValidProtocolFileName = (protocolFileName: string): boolean => {
  return protocolFileName.endsWith('.py') || protocolFileName.endsWith('.json')
}

export function ProtocolUploadInput(
  props: UploadInputProps
): JSX.Element | null {
  const { t } = useTranslation(['protocol_info', 'shared'])
  const dispatch = useDispatch<Dispatch>()
  const logger = useLogger(new URL('', import.meta.url).pathname)
  const trackEvent = useTrackEvent()
  const { makeToast } = useToaster()

  const handleUpload = (file: File): Promise<void> => {
    return remote.getFilePathFrom(file).then(filePath => {
      if (filePath == null) {
        logger.warn('Failed to upload file, path not found')
      }
      if (isValidProtocolFileName(file.name)) {
        dispatch(addProtocol(filePath))
      } else {
        makeToast(t('incompatible_file_type') as string, ERROR_TOAST, {
          closeButton: true,
        })
      }
      props.onUpload?.()
      trackEvent({
        name: ANALYTICS_IMPORT_PROTOCOL_TO_APP,
        properties: { protocolFileName: file.name },
      })
    })
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      alignItems={ALIGN_CENTER}
      marginY={SPACING.spacing20}
    >
      <UploadInput
        onUpload={(file: File) => {
          void handleUpload(file)
        }}
        uploadText={t('valid_file_types')}
        dragAndDropText={
          <LegacyStyledText as="p">
            <Trans
              t={t}
              i18nKey="shared:drag_and_drop"
              components={{
                a: <Link color={COLORS.blue55} role="button" />,
              }}
            />
          </LegacyStyledText>
        }
      />
    </Flex>
  )
}
