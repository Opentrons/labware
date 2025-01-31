import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  EmptySelectorButton,
  Flex,
  InfoScreen,
  JUSTIFY_FLEX_END,
  Modal,
  OVERFLOW_AUTO,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { ThermocyclerCycle } from './ThermocyclerCycle'
import { ThermocyclerStep } from './ThermocyclerStep'

import type { Dispatch, SetStateAction } from 'react'
import type { FormData } from '../../../../../../form-types'
import type { FieldPropsByName } from '../../types'
import type { ThermocyclerCycleType } from './ThermocyclerCycle'
import type { ThermocyclerStepType } from './ThermocyclerStep'

export type ThermocyclerStepTypeGeneral =
  | ThermocyclerCycleType
  | ThermocyclerStepType

interface ThermocyclerModalProps {
  formData: FormData
  propsForFields: FieldPropsByName
  setShowProfileModal: Dispatch<SetStateAction<boolean>>
}

export function ThermocyclerProfileModal(
  props: ThermocyclerModalProps
): JSX.Element {
  const { formData, propsForFields, setShowProfileModal } = props
  const { i18n, t } = useTranslation(['application', 'form'])

  const [showCreateNewStep, setShowCreateNewStep] = useState<boolean>(false)
  const [showCreateNewCycle, setShowCreateNewCycle] = useState<boolean>(false)
  const [isInEdit, setIsInEdit] = useState<boolean>(false)
  const [steps, setSteps] = useState<ThermocyclerStepTypeGeneral[]>(
    formData.orderedProfileItems.map(
      (id: string) => formData.profileItemsById[id]
    ) as ThermocyclerStepTypeGeneral[]
  )
  const canAddStepOrProfile = !(showCreateNewCycle || showCreateNewStep)

  const handleSaveModal = (): void => {
    propsForFields.profileItemsById.updateValue(
      steps.reduce((acc, step) => {
        return { ...acc, [step.id]: step }
      }, {})
    )
    propsForFields.orderedProfileItems.updateValue(steps.map(step => step.id))
    setShowProfileModal(false)
  }

  return (
    <Modal
      marginLeft="0"
      zIndexOverlay={11} // toolbox zIndex is set to 10
      title={t('form:step_edit_form.field.thermocyclerProfile.edit')}
      width="45rem"
      childrenPadding={SPACING.spacing24}
      footer={
        <Flex
          justifyContent={JUSTIFY_FLEX_END}
          gridGap={SPACING.spacing8}
          padding={`0 ${SPACING.spacing24} ${SPACING.spacing24}`}
        >
          <SecondaryButton
            onClick={() => {
              setShowProfileModal(false)
            }}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {i18n.format(t('cancel'), 'capitalize')}
            </StyledText>
          </SecondaryButton>
          <PrimaryButton
            onClick={handleSaveModal}
            disabled={isInEdit || showCreateNewCycle || showCreateNewStep}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {i18n.format(t('save'), 'capitalize')}
            </StyledText>
          </PrimaryButton>
        </Flex>
      }
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing24}
        maxHeight="31.875rem"
      >
        <Flex justifyContent={JUSTIFY_FLEX_END} gridGap={SPACING.spacing4}>
          <EmptySelectorButton
            text={t('form:step_edit_form.field.thermocyclerProfile.add_cycle')}
            onClick={() => {
              if (canAddStepOrProfile) {
                setShowCreateNewCycle(true)
              }
            }}
            textAlignment="left"
            iconName="plus"
            disabled={!canAddStepOrProfile}
          />
          <EmptySelectorButton
            text={t('form:step_edit_form.field.thermocyclerProfile.add_step')}
            onClick={() => {
              if (canAddStepOrProfile) {
                setShowCreateNewStep(true)
              }
            }}
            textAlignment="left"
            iconName="plus"
            disabled={!canAddStepOrProfile}
          />
        </Flex>
        {steps.length > 0 || showCreateNewStep || showCreateNewCycle ? (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing4}
            maxHeight="28.375rem"
            overflowY={OVERFLOW_AUTO}
          >
            {steps.map(step => {
              return step.type === 'profileStep' ? (
                <ThermocyclerStep
                  key={step.id}
                  step={step}
                  steps={steps}
                  setSteps={setSteps}
                  setShowCreateNewStep={setShowCreateNewStep}
                  setIsInEdit={setIsInEdit}
                  readOnly
                />
              ) : (
                // TODO (nd: 10/1/2024): add add profile cycle component
                <ThermocyclerCycle
                  key={step.id}
                  step={step}
                  steps={steps}
                  setSteps={setSteps}
                  setShowCreateNewCycle={setShowCreateNewCycle}
                  setIsInEdit={setIsInEdit}
                  readOnly
                />
              )
            })}
            {showCreateNewStep ? (
              <ThermocyclerStep
                steps={steps}
                setSteps={setSteps}
                setShowCreateNewStep={setShowCreateNewStep}
                setIsInEdit={setIsInEdit}
                readOnly={false}
              />
            ) : null}
            {showCreateNewCycle ? (
              <ThermocyclerCycle
                steps={steps}
                setSteps={setSteps}
                setShowCreateNewCycle={setShowCreateNewCycle}
                setIsInEdit={setIsInEdit}
                readOnly={false}
              />
            ) : null}
          </Flex>
        ) : (
          <InfoScreen
            content={t(
              'form:step_edit_form.field.thermocyclerProfile.no_steps'
            )}
          />
        )}
      </Flex>
    </Modal>
  )
}
