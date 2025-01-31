import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  InfoScreen,
  LiquidIcon,
  ListItem,
  ListItemDescriptor,
  SPACING,
  StyledText,
  Tag,
} from '@opentrons/components'
import { LINE_CLAMP_TEXT_STYLE } from '../../atoms'
import { getEnableLiquidClasses } from '../../feature-flags/selectors'
import { getLiquidClassDisplayName } from '../../liquid-defs/utils'

import type {
  AllIngredGroupFields,
  IngredInputs,
} from '../../labware-ingred/types'

const getLiquidDescription = (
  liquid: IngredInputs,
  enableLiquidClasses: boolean
): JSX.Element | null => {
  const { description, liquidClass } = liquid
  const liquidClassDisplayName = getLiquidClassDisplayName(liquidClass)
  const liquidClassInfo =
    !enableLiquidClasses || liquidClassDisplayName == null ? null : (
      <Tag text={liquidClassDisplayName} type="default" shrinkToContent />
    )

  return liquidClassInfo == null && !description ? null : (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
      {description ? (
        <StyledText
          desktopStyle="bodyDefaultRegular"
          css={LINE_CLAMP_TEXT_STYLE(10)}
        >
          {description}
        </StyledText>
      ) : null}
      {liquidClassInfo}
    </Flex>
  )
}

interface LiquidDefinitionsProps {
  allIngredientGroupFields: AllIngredGroupFields
}

export function LiquidDefinitions({
  allIngredientGroupFields,
}: LiquidDefinitionsProps): JSX.Element {
  const { t } = useTranslation('protocol_overview')
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)

  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
      <StyledText desktopStyle="headingSmallBold">
        {t('liquid_defs')}
      </StyledText>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        {Object.keys(allIngredientGroupFields).length > 0 ? (
          Object.values(allIngredientGroupFields).map((liquid, index) => {
            return (
              <ListItem
                type="noActive"
                key={`${liquid.name}_${liquid.displayColor}_${index}`}
              >
                <ListItemDescriptor
                  type="large"
                  description={
                    <Flex
                      alignItems={ALIGN_CENTER}
                      gridGap={SPACING.spacing8}
                      minWidth="13.75rem"
                      width="13.75rem"
                    >
                      <LiquidIcon color={liquid.displayColor} />
                      <StyledText
                        desktopStyle="bodyDefaultRegular"
                        id="liquid-name"
                        css={LINE_CLAMP_TEXT_STYLE(3)}
                      >
                        {liquid.name}
                      </StyledText>
                    </Flex>
                  }
                  content={
                    getLiquidDescription(liquid, enableLiquidClasses) ?? (
                      <StyledText
                        desktopStyle="bodyDefaultRegular"
                        alignSelf={ALIGN_CENTER}
                      >
                        {t('na')}
                      </StyledText>
                    )
                  }
                />
              </ListItem>
            )
          })
        ) : (
          <InfoScreen content={t('no_liquids_defined')} />
        )}
      </Flex>
    </Flex>
  )
}
