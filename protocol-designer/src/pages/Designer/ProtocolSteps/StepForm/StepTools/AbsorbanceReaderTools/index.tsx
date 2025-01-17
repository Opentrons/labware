import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  DIRECTION_COLUMN,
  Divider,
  Flex,
  RadioButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_INITIALIZE,
  ABSORBANCE_READER_LID,
  ABSORBANCE_READER_READ,
} from '../../../../../../constants'
import { DropdownStepFormField } from '../../../../../../molecules'
import { getRobotStateAtActiveItem } from '../../../../../../top-selectors/labware-locations'
import { getAbsorbanceReaderLabwareOptions } from '../../../../../../ui/modules/selectors'
import { hoverSelection } from '../../../../../../ui/steps/actions/actions'
import { InitializationSettings } from './InitializationSettings'
import { Initialization } from './Initialization'
import { LidControls } from './LidControls'
import { ReadSettings } from './ReadSettings'

import type { AbsorbanceReaderState } from '@opentrons/step-generation'
import type { AbsorbanceReaderFormType } from '../../../../../../form-types'
import type { StepFormProps } from '../../types'

export function AbsorbanceReaderTools(props: StepFormProps): JSX.Element {
  const {
    formData,
    propsForFields,
    toolboxStep,
    visibleFormErrors,
    showFormErrors,
  } = props
  const { moduleId } = formData
  const dispatch = useDispatch()
  const { t } = useTranslation(['application', 'form', 'protocol_steps'])
  const robotState = useSelector(getRobotStateAtActiveItem)
  const absorbanceReaderOptions = useSelector(getAbsorbanceReaderLabwareOptions)
  const { labware = {}, modules = {} } = robotState ?? {}
  const isLabwareOnAbsorbanceReader = useMemo(
    () => Object.values(labware).some(lw => lw.slot === moduleId),
    [moduleId]
  )
  const absorbanceReaderFormType = formData.absorbanceReaderFormType as AbsorbanceReaderFormType
  const absorbanceReaderState = modules[moduleId]
    ?.moduleState as AbsorbanceReaderState | null
  const initialization = absorbanceReaderState?.initialization ?? null

  const enableReadOrInitialization =
    !isLabwareOnAbsorbanceReader || initialization != null
  const compoundCommandType = isLabwareOnAbsorbanceReader
    ? ABSORBANCE_READER_READ
    : ABSORBANCE_READER_INITIALIZE

  // pre-select radio button on mount and module change if not previously set
  useEffect(() => {
    if (formData.absorbanceReaderFormType == null) {
      if (enableReadOrInitialization) {
        propsForFields.absorbanceReaderFormType.updateValue(compoundCommandType)
        return
      }
      propsForFields.absorbanceReaderFormType.updateValue(ABSORBANCE_READER_LID)
    }
  }, [formData.moduleId])

  const lidRadioButton = (
    <RadioButton
      onChange={() => {
        propsForFields.absorbanceReaderFormType.updateValue(
          ABSORBANCE_READER_LID
        )
      }}
      isSelected={absorbanceReaderFormType === ABSORBANCE_READER_LID}
      buttonLabel={t(
        `form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.${ABSORBANCE_READER_LID}`
      )}
      buttonValue={ABSORBANCE_READER_LID}
      largeDesktopBorderRadius
    />
  )

  const initializationModifier = initialization == null ? 'define' : 'change'
  const buttonLabelKey = `form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.${compoundCommandType}${
    compoundCommandType === 'absorbanceReaderInitialize'
      ? `.${initializationModifier}`
      : ''
  }`
  const compoundCommandButton = (
    <RadioButton
      onChange={() => {
        propsForFields.absorbanceReaderFormType.updateValue(compoundCommandType)
      }}
      isSelected={absorbanceReaderFormType === compoundCommandType}
      buttonLabel={t(buttonLabelKey)}
      buttonValue={compoundCommandType}
      largeDesktopBorderRadius
    />
  )

  const page1Content = (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing12}
      width="100%"
    >
      <DropdownStepFormField
        options={absorbanceReaderOptions}
        title={t('form:step_edit_form.field.absorbanceReader.moduleId.module')}
        {...propsForFields.moduleId}
        tooltipContent={null}
        onEnter={(id: string) => {
          dispatch(hoverSelection({ id, text: t('application:select') }))
        }}
        onExit={() => {
          dispatch(hoverSelection({ id: null, text: null }))
        }}
      />
      {moduleId != null ? (
        <>
          <Divider marginY="0" />
          <Flex paddingX={SPACING.spacing16}>
            <InitializationSettings initialization={initialization} />
          </Flex>
          <Divider marginY="0" />
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing4}
            paddingX={SPACING.spacing16}
          >
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('form:step_edit_form:absorbanceReader.module_controls')}
            </StyledText>
            {enableReadOrInitialization ? (
              <>
                {compoundCommandButton}
                {lidRadioButton}
              </>
            ) : (
              <LidControls fieldProps={propsForFields.lidOpen} />
            )}
          </Flex>
        </>
      ) : null}
    </Flex>
  )

  const page2ContentMap = {
    [ABSORBANCE_READER_READ]: (
      <ReadSettings
        propsForFields={propsForFields}
        visibleFormErrors={visibleFormErrors}
      />
    ),
    [ABSORBANCE_READER_INITIALIZE]: (
      <Initialization
        formData={formData}
        propsForFields={propsForFields}
        visibleFormErrors={visibleFormErrors}
        showFormErrors={showFormErrors}
      />
    ),
    [ABSORBANCE_READER_LID]: (
      <LidControls
        fieldProps={propsForFields.lidOpen}
        label={t(
          'form:step_edit_form.field.absorbanceReader.absorbanceReaderFormType.absorbanceReaderLid'
        )}
        paddingX={SPACING.spacing16}
      />
    ),
  }

  const contentByPage: JSX.Element[] = [
    page1Content,
    page2ContentMap[absorbanceReaderFormType],
  ]

  return <Flex paddingY={SPACING.spacing16}>{contentByPage[toolboxStep]}</Flex>
}
