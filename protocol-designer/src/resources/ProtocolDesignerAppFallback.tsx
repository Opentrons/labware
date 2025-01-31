import { useTranslation } from 'react-i18next'

// ToDo need to add analytics

import type { FallbackProps } from 'react-error-boundary'

import { actions } from '../load-file'
import {
  AlertPrimaryButton,
  ALIGN_FLEX_END,
  DIRECTION_COLUMN,
  Flex,
  Modal,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { useDispatch } from 'react-redux'
import type { ThunkDispatch } from '../types'

export function ProtocolDesignerAppFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): JSX.Element {
  const { t } = useTranslation('shared')

  const dispatch: ThunkDispatch<any> = useDispatch()
  const handleReloadClick = (): void => {
    resetErrorBoundary()
  }
  const handleDownloadProtocol = (): void => {
    dispatch(actions.saveProtocolFile())
  }

  return (
    <Modal type="warning" title={t('error_boundary_title')} marginLeft="0">
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('error_boundary_pd_app_description')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {error.message}
          </StyledText>
        </Flex>
        <Flex alignSelf={ALIGN_FLEX_END} gridGap={SPACING.spacing8}>
          <SecondaryButton onClick={handleDownloadProtocol}>
            {t('download_protocol')}
          </SecondaryButton>
          <AlertPrimaryButton onClick={handleReloadClick}>
            {t('reload_app')}
          </AlertPrimaryButton>
        </Flex>
      </Flex>
    </Modal>
  )
}
