import {
  COLORS,
  DIRECTION_COLUMN,
  EmptySelectorButton,
  Flex,
  SPACING,
  StyledText,
  Tabs,
} from '@opentrons/components'
import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { useState } from 'react'
import { COLUMN } from '@opentrons/shared-data'
import { ControlledAddTextAreaFields } from '../../molecules/ControlledAddTextAreaFields'
import { ControlledTextAreaField } from '../../atoms/ControlledTextAreaField'

export const STEPS_FIELD_NAME = 'steps'

export function StepsSection(): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const { setValue, watch } = useFormContext()
  const [isIndividualStep, setIsIndividualStep] = useState(true)

  const steps = watch(STEPS_FIELD_NAME) ?? []

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      height="100%"
      gap={SPACING.spacing16}
    >
      <StyledText color={COLORS.grey60} desktopStyle="headingSmallRegular">
        {t('steps_section_textbody')}
      </StyledText>

      <Tabs
        tabs={[
          {
            text: t('add_individual_step'),
            onClick: () => {
              setIsIndividualStep(true)
              setValue(STEPS_FIELD_NAME, [''], { shouldValidate: true })
            },
            isActive: isIndividualStep,
            disabled: false,
          },
          {
            text: t('paste_from_document'),
            onClick: () => {
              setIsIndividualStep(false)
              setValue(STEPS_FIELD_NAME, [], { shouldValidate: true })
            },
            isActive: !isIndividualStep,
            disabled: false,
          },
        ]}
      ></Tabs>

      <Flex
        flexDirection={DIRECTION_COLUMN}
        gap={SPACING.spacing10}
        padding={SPACING.spacing16}
        backgroundColor={COLORS.grey20}
      >
        {isIndividualStep ? (
          <>
            <EmptySelectorButton
              onClick={() => {
                setValue(STEPS_FIELD_NAME, [...steps, ''])
              }}
              text={t('add_step')}
              textAlignment="left"
              iconName="plus"
            />

            <ControlledAddTextAreaFields
              fieldName={STEPS_FIELD_NAME}
              name={t('step').toLowerCase()}
              textAreaHeight="163px"
            />
          </>
        ) : (
          <>
            <StyledText
              color={COLORS.grey60}
              desktopStyle="headingSmallRegular"
            >
              {t('paste_from_document_title')}
            </StyledText>

            <Flex
              flexDirection={COLUMN}
              gap={SPACING.spacing4}
              color={COLORS.grey60}
            >
              <ControlledTextAreaField
                name={STEPS_FIELD_NAME}
                height="180px"
                rules={{
                  required: true,
                }}
              />
              <StyledText desktopStyle="bodyDefaultRegular">
                {t('paste_from_document_input_caption_1')}
              </StyledText>
              <ExampleOrderedList>
                <li>
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('paste_from_document_input_caption_2')}
                  </StyledText>
                </li>
                <li>
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('paste_from_document_input_caption_3')}
                  </StyledText>
                </li>
              </ExampleOrderedList>
            </Flex>
          </>
        )}
      </Flex>
    </Flex>
  )
}

const ExampleOrderedList = styled.ol`
  margin-left: ${SPACING.spacing20};
  font-size: 14px;
`
