import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Banner,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'
import * as timelineWarningSelectors from '../../top-selectors/timelineWarnings'
import { getSelectedStepId } from '../../ui/steps'
import {
  actions as dismissActions,
  selectors as dismissSelectors,
} from '../../dismiss'
import { selectors as stepFormSelectors } from '../../step-forms'
import {
  getVisibleFormErrors,
  getVisibleFormWarnings,
  getVisibleProfileFormLevelErrors,
} from '../../pages/Designer/ProtocolSteps/StepForm/utils'
import { WarningContents } from './WarningContents'

import type { ReactNode } from 'react'
import type { ProfileItem } from '@opentrons/step-generation'
import type { StepFieldName } from '../../form-types'
import type { ProfileFormError } from '../../steplist/formLevel/profileErrors'
import type { MakeAlert } from './types'

interface FormAlertsProps {
  showFormErrors: boolean
  focusedField?: StepFieldName | null
  dirtyFields?: StepFieldName[]
  page: number
}

interface WarningType {
  title: string
  description: ReactNode | null
}

function FormAlertsComponent(props: FormAlertsProps): JSX.Element | null {
  const { showFormErrors, focusedField, dirtyFields, page } = props

  const { t } = useTranslation('alert')
  const dispatch = useDispatch()
  const formLevelErrorsForUnsavedForm = useSelector(
    stepFormSelectors.getFormLevelErrorsForUnsavedForm
  )
  const formWarningsForSelectedStep = useSelector(
    dismissSelectors.getFormWarningsForSelectedStep
  )
  const timelineWarningsForSelectedStep = useSelector(
    timelineWarningSelectors.getTimelineWarningsForSelectedStep
  )
  const unsavedForm = useSelector(stepFormSelectors.getHydratedUnsavedForm)
  const dynamicFieldFormErrors = useSelector(
    stepFormSelectors.getDynamicFieldFormErrorsForUnsavedForm
  )
  const stepId = useSelector(getSelectedStepId)

  const timelineWarnings = timelineWarningsForSelectedStep.map(warning => ({
    title: t(`timeline.warning.${warning.type}.title`),
    description: (
      <WarningContents level="timeline" warningType={warning.type} />
    ),
    dismissId: warning.type,
  }))

  const visibleFormWarnings = getVisibleFormWarnings({
    focusedField,
    dirtyFields: dirtyFields ?? [],
    errors: formWarningsForSelectedStep,
  })
  const visibleFormErrors = getVisibleFormErrors({
    focusedField,
    dirtyFields: dirtyFields ?? [],
    errors: formLevelErrorsForUnsavedForm,
    page,
    showErrors: showFormErrors,
  })

  const profileItemsById: Record<string, ProfileItem> | null | undefined =
    unsavedForm?.profileItemsById

  let visibleDynamicFieldFormErrors: ProfileFormError[] = []

  if (profileItemsById != null) {
    visibleDynamicFieldFormErrors = getVisibleProfileFormLevelErrors({
      focusedField,
      dirtyFields: dirtyFields ?? [],
      errors: dynamicFieldFormErrors,
      profileItemsById,
    })
  }

  const makeHandleCloseWarning = (dismissId?: string | null) => () => {
    console.assert(
      dismissId,
      'expected dismissId, Alert cannot dismiss warning'
    )
    if (dismissId) {
      dismissWarning(dismissId)
    }
  }

  const makeAlert: MakeAlert = (alertType, data, key) => (
    <Flex>
      <Banner
        type={alertType === 'error' ? 'error' : 'warning'}
        key={`${alertType}:${key}`}
        onCloseClick={
          alertType === 'warning'
            ? makeHandleCloseWarning(data.dismissId)
            : undefined
        }
        width="100%"
        iconMarginLeft={SPACING.spacing4}
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {data.title}
          </StyledText>
          {data.description != null ? (
            <StyledText desktopStyle="bodyDefaultRegular">
              {data.description}
            </StyledText>
          ) : null}
        </Flex>
      </Banner>
    </Flex>
  )

  const filteredFormErrorsForBanner = visibleFormErrors.reduce<WarningType[]>(
    (acc, error) => {
      return error.showAtForm ?? true
        ? [
            ...acc,
            {
              title: error.title,
              description: error.body ?? null,
            },
          ]
        : acc
    },
    []
  )

  const formErrors = [
    ...filteredFormErrorsForBanner,
    ...visibleDynamicFieldFormErrors.map(error => ({
      title: error.title,
      description: error.body ?? null,
    })),
  ]

  const formWarnings = visibleFormWarnings.map(warning => ({
    title: warning.title,
    description: warning.body ?? null,
    dismissId: warning.type,
  }))

  const dismissWarning = (dismissId: string): void => {
    const isTimelineWarning = Object.values(timelineWarnings).some(
      warning => warning.dismissId === dismissId
    )
    if (isTimelineWarning && stepId) {
      dispatch(
        dismissActions.dismissTimelineWarning({
          type: dismissId,
        })
      )
    } else {
      dispatch(
        dismissActions.dismissFormWarning({
          type: dismissId,
        })
      )
    }
  }

  return [...formErrors, ...timelineWarnings, ...formWarnings].length > 0 ? (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      padding={`${SPACING.spacing16} ${SPACING.spacing16} 0`}
      gridGap={SPACING.spacing4}
    >
      {showFormErrors
        ? formErrors.map((error, key) => makeAlert('error', error, key))
        : null}
      {timelineWarnings.map((warning, key) =>
        makeAlert('warning', warning, key)
      )}
      {formWarnings.map((warning, key) => makeAlert('warning', warning, key))}
    </Flex>
  ) : null
}

export const FormAlerts = memo(FormAlertsComponent)
