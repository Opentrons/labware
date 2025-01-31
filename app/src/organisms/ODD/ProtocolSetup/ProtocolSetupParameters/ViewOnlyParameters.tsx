import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  formatRunTimeParameterValue,
  sortRuntimeParameters,
} from '@opentrons/shared-data'
import {
  ALIGN_CENTER,
  BORDERS,
  Chip,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { useToaster } from '/app/organisms/ToasterOven'

import type { Dispatch, SetStateAction } from 'react'
import type { SetupScreens } from '../types'

export interface ViewOnlyParametersProps {
  runId: string
  setSetupScreen: Dispatch<SetStateAction<SetupScreens>>
}

export function ViewOnlyParameters({
  runId,
  setSetupScreen,
}: ViewOnlyParametersProps): JSX.Element {
  const { t } = useTranslation('protocol_setup')
  const { makeSnackbar } = useToaster()
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const handleOnClick = (): void => {
    makeSnackbar(t('reset_setup') as string)
  }

  const parameters = mostRecentAnalysis?.runTimeParameters ?? []

  return (
    <>
      <ChildNavigation
        header={t('parameters')}
        onClickBack={() => {
          setSetupScreen('prepare to run')
        }}
        inlineNotification={{
          type: 'neutral',
          heading: t('values_are_view_only'),
        }}
      />
      <Flex
        marginTop="7.75rem"
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
        paddingX={SPACING.spacing8}
      >
        <Flex
          gridGap={SPACING.spacing8}
          color={COLORS.grey60}
          fontSize={TYPOGRAPHY.fontSize20}
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          lineHeight={TYPOGRAPHY.lineHeight24}
        >
          <LegacyStyledText paddingLeft={SPACING.spacing16} width="50%">
            {t('name')}
          </LegacyStyledText>
          <LegacyStyledText>{t('value')}</LegacyStyledText>
        </Flex>
        {sortRuntimeParameters(parameters).map((parameter, index) => {
          return (
            <Flex
              onClick={handleOnClick}
              key={`${parameter.displayName}_${index}`}
              alignItems={ALIGN_CENTER}
              backgroundColor={COLORS.grey35}
              borderRadius={BORDERS.borderRadius8}
              padding={`${SPACING.spacing16} ${SPACING.spacing24}`}
              gridGap={SPACING.spacing24}
            >
              <LegacyStyledText
                width="48%"
                as="p"
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              >
                {parameter.displayName}
              </LegacyStyledText>
              <Flex
                alignItems={ALIGN_CENTER}
                flexDirection={DIRECTION_ROW}
                gridGap={SPACING.spacing8}
              >
                <LegacyStyledText as="p" css={PARAMETER_VALUE_STYLE}>
                  {formatRunTimeParameterValue(parameter, t)}
                </LegacyStyledText>
                {parameter.type === 'csv_file' ||
                parameter.value !== parameter.default ? (
                  <Chip
                    data-testid={`Chip_${parameter.variableName}`}
                    type="success"
                    text={t('updated')}
                    hasIcon={false}
                    chipSize="small"
                  />
                ) : null}
              </Flex>
            </Flex>
          )
        })}
      </Flex>
    </>
  )
}

const PARAMETER_VALUE_STYLE = css`
  color: ${COLORS.grey60};
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  -webkit-line-clamp: 1;
  max-width: 15rem;
`
