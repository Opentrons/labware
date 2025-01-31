import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import noop from 'lodash/noop'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DeckInfoLabel,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
  Tag,
} from '@opentrons/components'
import { formatVolume } from './utils'
import type { AdditionalEquipmentName } from '@opentrons/step-generation'

import type { SubstepIdentifier, SubstepWellData } from '../../../../steplist'

interface SubstepProps {
  trashName: AdditionalEquipmentName | null
  stepId: string
  substepIndex: number
  volume?: number | string | null
  source?: SubstepWellData
  dest?: SubstepWellData
  selectSubstep?: (substepIdentifier: SubstepIdentifier) => void
  isSameLabware?: boolean
}

function SubstepComponent(props: SubstepProps): JSX.Element {
  const {
    volume,
    stepId,
    substepIndex,
    source,
    dest,
    trashName,
    selectSubstep: propSelectSubstep,
    isSameLabware,
  } = props
  const { i18n, t } = useTranslation([
    'application',
    'protocol_steps',
    'shared',
  ])

  const selectSubstep = propSelectSubstep ?? noop

  const volumeTag = (
    <Tag
      text={`${formatVolume(volume)} ${t('units.microliter')}`}
      type="default"
    />
  )

  const isMix = source?.well === dest?.well && isSameLabware

  return (
    <Flex
      onMouseEnter={() => {
        selectSubstep({
          stepId,
          substepIndex,
        })
      }}
      onMouseLeave={() => {
        selectSubstep(null)
      }}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
    >
      {isMix ? (
        <ListItem type="noActive">
          <Flex
            gridGap={SPACING.spacing4}
            padding={SPACING.spacing12}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            width="100%"
            alignItems={ALIGN_CENTER}
          >
            <Flex gridGap={SPACING.spacing4} alignItems={ALIGN_CENTER}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {t('protocol_steps:mix')}
              </StyledText>
              {volumeTag}
              <StyledText desktopStyle="bodyDefaultRegular">
                {t('protocol_steps:in')}
              </StyledText>
              <DeckInfoLabel
                deckLabel={i18n.format(
                  t('protocol_steps:well_name', {
                    wellName: source?.well ?? '',
                  }),
                  'upperCase'
                )}
              />
            </Flex>
          </Flex>
        </ListItem>
      ) : (
        <>
          {source != null ? (
            <ListItem type="noActive">
              <Flex
                gridGap={SPACING.spacing4}
                padding={SPACING.spacing12}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                width="100%"
                alignItems={ALIGN_CENTER}
              >
                <Flex gridGap={SPACING.spacing4} alignItems={ALIGN_CENTER}>
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('protocol_steps:aspirated')}
                  </StyledText>
                  {volumeTag}
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('protocol_steps:from')}
                  </StyledText>
                  <DeckInfoLabel
                    deckLabel={i18n.format(
                      t('protocol_steps:well_name', {
                        wellName: source.well,
                      }),
                      'upperCase'
                    )}
                  />
                </Flex>
              </Flex>
            </ListItem>
          ) : null}
          {dest != null ? (
            <ListItem type="noActive">
              <Flex
                gridGap={SPACING.spacing4}
                padding={SPACING.spacing12}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                width="100%"
                alignItems={ALIGN_CENTER}
              >
                {dest != null || trashName != null ? (
                  <Flex gridGap={SPACING.spacing4} alignItems={ALIGN_CENTER}>
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('protocol_steps:dispensed')}
                    </StyledText>
                    {volumeTag}
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('protocol_steps:into')}
                    </StyledText>

                    <DeckInfoLabel
                      deckLabel={i18n.format(
                        dest?.well != null
                          ? t('protocol_steps:well_name', {
                              wellName: dest.well,
                            })
                          : t(`shared:${trashName}`),
                        'upperCase'
                      )}
                    />
                  </Flex>
                ) : null}
              </Flex>
            </ListItem>
          ) : null}
        </>
      )}
    </Flex>
  )
}

export const Substep = memo(SubstepComponent)
