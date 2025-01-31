import { useDispatch } from 'react-redux'
import { useTranslation, Trans } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Link,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import {
  addCustomLabwareFile,
  addCustomLabware,
} from '/app/redux/custom-labware'
import { Slideout } from '/app/atoms/Slideout'
import {
  useTrackEvent,
  ANALYTICS_ADD_CUSTOM_LABWARE,
} from '/app/redux/analytics'
import { UploadInput } from '/app/molecules/UploadInput'
import { remote } from '/app/redux/shell/remote'

import type { Dispatch } from '/app/redux/types'

export interface AddCustomLabwareSlideoutProps {
  isExpanded: boolean
  onCloseClick: () => void
}

export function AddCustomLabwareSlideout(
  props: AddCustomLabwareSlideoutProps
): JSX.Element {
  const { t } = useTranslation(['labware_landing', 'shared'])
  const dispatch = useDispatch<Dispatch>()
  const trackEvent = useTrackEvent()

  return (
    <Slideout
      title={t('import_custom_def')}
      onCloseClick={props.onCloseClick}
      isExpanded={props.isExpanded}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        gridGap={SPACING.spacing16}
      >
        <UploadInput
          onUpload={(file: File) => {
            void remote.getFilePathFrom(file).then(filePath => {
              dispatch(addCustomLabwareFile(filePath))
            })
          }}
          onClick={() => {
            dispatch(addCustomLabware())
            trackEvent({
              name: ANALYTICS_ADD_CUSTOM_LABWARE,
              properties: {},
            })
          }}
          uploadText={t('choose_file_to_upload')}
          dragAndDropText={
            <LegacyStyledText as="p">
              <Trans
                t={t}
                i18nKey="shared:drag_and_drop"
                components={{
                  a: (
                    <Link
                      color={COLORS.blue50}
                      onClick={() => dispatch(addCustomLabware())}
                      role="button"
                    />
                  ),
                }}
              />
            </LegacyStyledText>
          }
        />
      </Flex>
    </Slideout>
  )
}
