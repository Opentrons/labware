import {
  ALIGN_START,
  Box,
  C_BLUE,
  DIRECTION_COLUMN,
  Flex,
  FONT_WEIGHT_SEMIBOLD,
  JUSTIFY_CENTER,
  JUSTIFY_START,
  PrimaryBtn,
  SPACING_3,
  SPACING_4,
  Text,
  TEXT_TRANSFORM_UPPERCASE,
} from '@opentrons/components'
import * as React from 'react'
import { DeckMap } from './DeckMap'
import { SectionList } from './SectionList'
import { LabwareOffsetsSummary } from './LabwareOffsetsSummary'
import { useIntroInfo, useLabwareIdsBySection } from './hooks'
import { useTranslation } from 'react-i18next'

export const SummaryScreen = (): JSX.Element | null => {
  const { t } = useTranslation('labware_position_check')
  const introInfo = useIntroInfo()
  const labwareIdsBySection = useLabwareIdsBySection()
  if (introInfo == null) return null
  const { sections, primaryPipetteMount, secondaryPipetteMount } = introInfo

  return (
    <Box margin={SPACING_3}>
      <Text
        as={'h3'}
        textTransform={TEXT_TRANSFORM_UPPERCASE}
        fontWeight={FONT_WEIGHT_SEMIBOLD}
        marginBottom={SPACING_3}
        marginLeft={SPACING_3}
      >
        {t('lpc_complete_summary_screen_heading')}
      </Text>
      <Flex justifyContent={JUSTIFY_START} alignItems={ALIGN_START}>
        <Box width="55%" flexDirection={DIRECTION_COLUMN}>
          <SectionList
            primaryPipetteMount={primaryPipetteMount}
            secondaryPipetteMount={secondaryPipetteMount}
            sections={sections}
            completedSections={[
              sections[0],
              sections[1],
              sections[2],
              sections[3],
            ]}
          />
          <Flex justifyContent={JUSTIFY_CENTER}>
            <DeckMap
              completedLabwareIdSections={
                (labwareIdsBySection[sections[0]],
                labwareIdsBySection[sections[1]],labwareIdsBySection[sections[2]])
              }
            />
          </Flex>
        </Box>
        <Box width="80%" marginRight={SPACING_4}>
          <LabwareOffsetsSummary />
        </Box>
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER} marginBottom={SPACING_4}>
        <PrimaryBtn
          title={t('close_and_apply_offset_data')}
          backgroundColor={C_BLUE} // TODO: hook up CTA
        >
          {t('close_and_apply_offset_data')}
        </PrimaryBtn>
      </Flex>
    </Box>
  )
}
