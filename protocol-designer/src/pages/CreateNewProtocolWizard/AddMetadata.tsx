import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { HandleEnter } from '../../atoms/HandleEnter'
import { analyticsEvent } from '../../analytics/actions'
import { ONBOARDING_FLOW_DURATION_EVENT } from '../../analytics/constants'
import { WizardBody } from './WizardBody'

import type { AnalyticsEvent } from '../../analytics/mixpanel'
import type { WizardTileProps } from './types'

const FLEX_METADATA_WIZARD_STEP = 6
const OT2_METADATA_WIZARD_STEP = 4
interface AddMetadataProps extends WizardTileProps {
  analyticsStartTime: Date
}
export function AddMetadata(props: AddMetadataProps): JSX.Element | null {
  const { goBack, proceed, watch, register, analyticsStartTime } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const fields = watch('fields')
  const dispatch = useDispatch()
  const robotType = fields.robotType

  const handleProceed = (): void => {
    const duration = new Date().getTime() - analyticsStartTime.getTime()
    const onboardingDuration: AnalyticsEvent = {
      name: ONBOARDING_FLOW_DURATION_EVENT,
      properties: { duration: `${duration / 1000} seconds` },
    }
    dispatch(analyticsEvent(onboardingDuration))
    proceed(1)
  }
  return (
    <HandleEnter onEnter={handleProceed}>
      <WizardBody
        robotType={robotType}
        stepNumber={
          robotType === FLEX_ROBOT_TYPE
            ? FLEX_METADATA_WIZARD_STEP
            : OT2_METADATA_WIZARD_STEP
        }
        header={t('tell_us')}
        disabled={false}
        goBack={() => {
          goBack(1)
        }}
        proceed={handleProceed}
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText desktopStyle="captionRegular" color={COLORS.grey60}>
              {t('name')}
            </StyledText>
            <InputField
              {...register('fields.name')}
              type="text"
              value={watch('fields.name')}
              min=""
              max=""
              autoFocus
            />
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText desktopStyle="captionRegular" color={COLORS.grey60}>
              {t('description')}
            </StyledText>
            <DescriptionField {...register('fields.description')} />
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText desktopStyle="captionRegular" color={COLORS.grey60}>
              {t('author_org')}
            </StyledText>
            <InputField
              {...register('fields.organizationOrAuthor')}
              type="text"
              value={watch('fields.organizationOrAuthor')}
              min=""
              max=""
            />
          </Flex>
        </Flex>
      </WizardBody>
    </HandleEnter>
  )
}

export const DescriptionField = styled.textarea`
  min-height: 5rem;
  width: 100%;
  border: 1px ${BORDERS.styleSolid} ${COLORS.grey50};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  font-size: ${TYPOGRAPHY.fontSizeP};
  resize: none;
`
