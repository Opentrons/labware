import {
  COLORS,
  Flex,
  LabwareRender,
  Module,
  MoveLabwareOnDeck,
} from '@opentrons/components'
import { inferModuleOrientationFromXCoordinate } from '@opentrons/shared-data'

import { useTranslation } from 'react-i18next'
import { RecoverySingleColumnContentWrapper } from './RecoveryContentWrapper'
import { TwoColumn, DeckMapContent } from '/app/molecules/InterventionModal'
import { RecoveryFooterButtons } from './RecoveryFooterButtons'
import { LeftColumnLabwareInfo } from './LeftColumnLabwareInfo'
import { RECOVERY_MAP } from '../constants'

import type { ComponentProps } from 'react'
import type { RecoveryContentProps } from '../types'
import type { InterventionContent } from '/app/molecules/InterventionModal/InterventionContent'

export function TwoColLwInfoAndDeck(
  props: RecoveryContentProps
): JSX.Element | null {
  const {
    routeUpdateActions,
    failedPipetteUtils,
    failedLabwareUtils,
    deckMapUtils,
    currentRecoveryOptionUtils,
    isOnDevice,
  } = props
  const {
    RETRY_NEW_TIPS,
    SKIP_STEP_WITH_NEW_TIPS,
    MANUAL_MOVE_AND_SKIP,
    MANUAL_REPLACE_AND_RETRY,
    HOME_AND_RETRY,
  } = RECOVERY_MAP
  const { selectedRecoveryOption } = currentRecoveryOptionUtils
  const { relevantWellName, failedLabware } = failedLabwareUtils
  const { proceedNextStep } = routeUpdateActions
  const { failedPipetteInfo, isPartialTipConfigValid } = failedPipetteUtils
  const { t } = useTranslation('error_recovery')

  const primaryOnClick = (): void => {
    void proceedNextStep()
  }

  const {
    displayNameCurrentLoc: slot,
  } = failedLabwareUtils.failedLabwareLocations

  const buildTitle = (): string => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
        return t('manually_move_lw_on_deck')
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        return t('manually_replace_lw_on_deck')
      case HOME_AND_RETRY.ROUTE:
      case RETRY_NEW_TIPS.ROUTE:
      case SKIP_STEP_WITH_NEW_TIPS.ROUTE: {
        // Only special case the "full" 96-channel nozzle config.
        if (
          failedPipetteInfo?.data.channels === 96 &&
          !isPartialTipConfigValid
        ) {
          return t('replace_with_new_tip_rack', { slot })
        } else {
          return t('replace_used_tips_in_rack_location', {
            location: relevantWellName,
            slot,
          })
        }
      }
      default:
        console.error(
          `TwoColLwInfoAndDeck: Unexpected recovery option: ${selectedRecoveryOption}. Handle retry step copy explicitly.`
        )
        return 'UNEXPECTED RECOVERY OPTION'
    }
  }

  const buildBannerText = (): string => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        return t('ensure_lw_is_accurately_placed')
      case RETRY_NEW_TIPS.ROUTE:
      case SKIP_STEP_WITH_NEW_TIPS.ROUTE:
      case HOME_AND_RETRY.ROUTE: {
        return isPartialTipConfigValid
          ? t('replace_tips_and_select_loc_partial_tip')
          : t('replace_tips_and_select_location')
      }
      default:
        console.error(
          `TwoColLwInfoAndDeck:buildBannerText: Unexpected recovery option ${selectedRecoveryOption}. Handle retry step copy explicitly.`
        )
        return 'UNEXPECTED RECOVERY OPTION'
    }
  }

  const buildType = (): ComponentProps<
    typeof InterventionContent
  >['infoProps']['type'] => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE:
        return 'location-arrow-location'
      default:
      case MANUAL_REPLACE_AND_RETRY.ROUTE:
        return 'location'
    }
  }

  // TODO(jh, 10-22-24): Componentize an app-only abstraction above MoveLabwareOnDeck. EXEC-788.
  const buildDeckView = (): JSX.Element => {
    switch (selectedRecoveryOption) {
      case MANUAL_MOVE_AND_SKIP.ROUTE: {
        const { newLoc, currentLoc } = failedLabwareUtils.failedLabwareLocations
        const {
          movedLabwareDef,
          moduleRenderInfo,
          labwareRenderInfo,
          ...restUtils
        } = deckMapUtils

        const failedLwId = failedLabware?.id ?? ''

        const isValidDeck =
          currentLoc != null && newLoc != null && movedLabwareDef != null

        return isValidDeck ? (
          <MoveLabwareOnDeck
            deckFill={isOnDevice ? COLORS.grey35 : '#e6e6e6'}
            initialLabwareLocation={currentLoc}
            finalLabwareLocation={newLoc}
            movedLabwareDef={movedLabwareDef}
            {...restUtils}
            backgroundItems={
              <>
                {moduleRenderInfo.map(
                  ({
                    x,
                    y,
                    moduleId,
                    moduleDef,
                    nestedLabwareDef,
                    nestedLabwareId,
                  }) => (
                    <Module
                      key={moduleId}
                      def={moduleDef}
                      x={x}
                      y={y}
                      orientation={inferModuleOrientationFromXCoordinate(x)}
                    >
                      {nestedLabwareDef != null &&
                      nestedLabwareId !== failedLwId ? (
                        <LabwareRender definition={nestedLabwareDef} />
                      ) : null}
                    </Module>
                  )
                )}
                {labwareRenderInfo
                  .filter(l => l.labwareId !== failedLwId)
                  .map(({ x, y, labwareDef, labwareId }) => (
                    <g key={labwareId} transform={`translate(${x},${y})`}>
                      {labwareDef != null && labwareId !== failedLwId ? (
                        <LabwareRender definition={labwareDef} />
                      ) : null}
                    </g>
                  ))}
              </>
            }
          />
        ) : (
          <Flex />
        )
      }
      default:
        return <DeckMapContent {...deckMapUtils} />
    }
  }

  return (
    <RecoverySingleColumnContentWrapper>
      <TwoColumn>
        <LeftColumnLabwareInfo
          {...props}
          title={buildTitle()}
          type={buildType()}
          bannerText={buildBannerText()}
        />
        <Flex marginTop="0.7rem">{buildDeckView()}</Flex>
      </TwoColumn>
      <RecoveryFooterButtons primaryBtnOnClick={primaryOnClick} />
    </RecoverySingleColumnContentWrapper>
  )
}
