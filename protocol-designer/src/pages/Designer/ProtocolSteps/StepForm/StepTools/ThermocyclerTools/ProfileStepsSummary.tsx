import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  ListButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getMainPagePortalEl } from '../../../../../../organisms'
import { ThermocyclerProfileModal } from './ThermocyclerProfileModal'

import type { FormData } from '../../../../../../form-types'
import type { FieldPropsByName } from '../../types'

interface ProfileStepsSummaryProps {
  formData: FormData
  propsForFields: FieldPropsByName
}
export function ProfileStepsSummary(
  props: ProfileStepsSummaryProps
): JSX.Element {
  const { formData, propsForFields } = props
  const { i18n, t } = useTranslation('form')
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false)

  return (
    <>
      {showProfileModal
        ? createPortal(
            <ThermocyclerProfileModal
              formData={formData}
              propsForFields={propsForFields}
              setShowProfileModal={setShowProfileModal}
            />,
            getMainPagePortalEl()
          )
        : null}
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing12}
        padding={`0 ${SPACING.spacing16}`}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {i18n.format(
            t('step_edit_form.field.thermocyclerProfile.steps'),
            'capitalize'
          )}
        </StyledText>
        <ListButton
          type="noActive"
          onClick={() => {
            setShowProfileModal(true)
          }}
          padding={SPACING.spacing12}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {formData.orderedProfileItems.length === 0
              ? t('step_edit_form.field.thermocyclerProfile.no_profile')
              : t(
                  'step_edit_form.field.thermocyclerProfile.step_profile_defined',
                  {
                    steps: formData.orderedProfileItems.length,
                  }
                )}
          </StyledText>
        </ListButton>
      </Flex>
    </>
  )
}
