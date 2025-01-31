import {
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  Flex,
  JUSTIFY_FLEX_END,
  LargeButton,
  SPACING,
} from '@opentrons/components'
import { useTranslation } from 'react-i18next'
import { Accordion } from '../../molecules/Accordion'
import styled from 'styled-components'
import { ApplicationSection } from '../../organisms/ApplicationSection'
import { createProtocolAtom } from '../../resources/atoms'
import { useAtom } from 'jotai'
import { InstrumentsSection } from '../InstrumentsSection'
import { ModulesSection } from '../ModulesSection'
import { LabwareLiquidsSection } from '../LabwareLiquidsSection'
import { StepsSection } from '../StepsSection'
import { useFormContext } from 'react-hook-form'
import { COLUMN } from '@opentrons/shared-data'

export const APPLICATION_STEP = 0
export const INSTRUMENTS_STEP = 1
export const MODULES_STEP = 2
export const LABWARE_LIQUIDS_STEP = 3
export const STEPS_STEP = 4

export function ProtocolSectionsContainer(): JSX.Element | null {
  const { t } = useTranslation('create_protocol')
  const {
    formState: { isValid },
  } = useFormContext()
  const [{ currentSection, focusSection }, setCreateProtocolAtom] = useAtom(
    createProtocolAtom
  )

  function handleSectionClick(stepNumber: number): void {
    currentSection >= stepNumber &&
      isValid &&
      setCreateProtocolAtom({
        currentSection,
        focusSection: stepNumber,
      })
  }

  function displayCheckmark(stepNumber: number): boolean {
    return currentSection > stepNumber && focusSection !== stepNumber
  }

  function handleConfirmButtonClick(): void {
    const step =
      currentSection > focusSection ? currentSection : focusSection + 1

    setCreateProtocolAtom({
      currentSection: step,
      focusSection: step,
    })
  }

  return (
    <ProtocolSections>
      {[
        {
          sectionNumber: APPLICATION_STEP,
          title: 'application_title',
          Component: ApplicationSection,
        },
        {
          sectionNumber: INSTRUMENTS_STEP,
          title: 'instruments_title',
          Component: InstrumentsSection,
        },
        {
          sectionNumber: MODULES_STEP,
          title: 'modules_title',
          Component: ModulesSection,
        },
        {
          sectionNumber: LABWARE_LIQUIDS_STEP,
          title: 'labware_liquids_title',
          Component: LabwareLiquidsSection,
        },
        {
          sectionNumber: STEPS_STEP,
          title: 'steps_title',
          Component: StepsSection,
        },
      ].map(({ sectionNumber, title, Component }) => (
        <Accordion
          key={sectionNumber}
          heading={t(title)}
          isOpen={focusSection === sectionNumber}
          handleClick={() => {
            handleSectionClick(sectionNumber)
          }}
          isCompleted={displayCheckmark(sectionNumber)}
        >
          {focusSection === sectionNumber && (
            <Flex flexDirection={COLUMN} gap={SPACING.spacing16}>
              <Component />
              <ButtonContainer>
                <LargeButton
                  onClick={handleConfirmButtonClick}
                  disabled={!isValid}
                  buttonText={t('section_confirm_button')}
                ></LargeButton>
              </ButtonContainer>
            </Flex>
          )}
        </Accordion>
      ))}
    </ProtocolSections>
  )
}

const ProtocolSections = styled(Flex)`
  flex-direction: ${DIRECTION_COLUMN};
  width: 100%;
  gap: ${SPACING.spacing16};
`

const ButtonContainer = styled.div`
  display: ${DISPLAY_FLEX};
  justify-content: ${JUSTIFY_FLEX_END};
`
