import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { setFeatureFlags } from '../../feature-flags/actions'
import { HandleEnter } from '../../atoms/HandleEnter'

import type { ThunkDispatch } from 'redux-thunk'
import type { BaseState } from '../../types'

interface IncompatibleTipsProps {
  onClose: () => void
}
export function IncompatibleTipsModal(
  props: IncompatibleTipsProps
): JSX.Element {
  const { onClose } = props
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const { t } = useTranslation(['create_new_protocol', 'shared'])

  const handleShowAllTips = (): void => {
    onClose()
    dispatch(
      setFeatureFlags({
        OT_PD_ALLOW_ALL_TIPRACKS: true,
      })
    )
  }

  return (
    <HandleEnter onEnter={handleShowAllTips}>
      <Modal
        marginLeft="0"
        title={t('incompatible_tips')}
        type="warning"
        closeOnOutsideClick
        onClose={onClose}
        footer={
          <Flex
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
            padding={SPACING.spacing24}
          >
            <SecondaryButton onClick={handleShowAllTips}>
              {t('show_tips')}
            </SecondaryButton>
            <PrimaryButton onClick={onClose}>
              {t('shared:cancel')}
            </PrimaryButton>
          </Flex>
        }
      >
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('incompatible_tip_body')}
        </StyledText>
      </Modal>
    </HandleEnter>
  )
}
