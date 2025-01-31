import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'

import type { ReactNode } from 'react'
import type { ModuleOnDeck, PipetteOnDeck } from '../../step-forms'
import type { HintKey } from '../../tutorial'
import type { Fixture } from './index'

interface MissingContent {
  noCommands: boolean
  pipettesWithoutStep: PipetteOnDeck[]
  modulesWithoutStep: ModuleOnDeck[]
  gripperWithoutStep: boolean
  fixtureWithoutStep: Fixture
  t: any
}

export interface WarningContent {
  content: ReactNode
  heading?: string
  titleElement?: JSX.Element
  hintKey?: HintKey
}

export function getWarningContent({
  noCommands,
  pipettesWithoutStep,
  modulesWithoutStep,
  gripperWithoutStep,
  fixtureWithoutStep,
  t,
}: MissingContent): WarningContent | null {
  if (noCommands) {
    return {
      hintKey: 'no_commands',
      content: (
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('alert:export_warnings.redesign.no_commands.body1')}
        </StyledText>
      ),
    }
  } else if (
    pipettesWithoutStep.length +
      modulesWithoutStep.length +
      (gripperWithoutStep ? 1 : 0) +
      fixtureWithoutStep.stagingAreaSlots.length +
      (fixtureWithoutStep.trashBin ? 1 : 0) +
      (fixtureWithoutStep.wasteChute ? 1 : 0) >=
    1
  ) {
    const allUnusedContent = [
      ...pipettesWithoutStep.map(pipette =>
        t('alert:export_warnings.redesign.unused_pipette', {
          pipette: pipette.spec.displayName,
          mount: pipette.mount,
        })
      ),
      ...(gripperWithoutStep
        ? [t('modules:additional_equipment_display_names.gripper')]
        : []),
      ...modulesWithoutStep.map(module =>
        t('alert:export_warnings.redesign.unused_module', {
          module: getModuleDisplayName(module.model),
          slot: module.slot,
        })
      ),
      ...fixtureWithoutStep.stagingAreaSlots.map(slot =>
        t('alert:export_warnings.redesign.unused_staging_area', { slot })
      ),
      ...(fixtureWithoutStep.trashBin
        ? [t('modules:additional_equipment_display_names.trashBin')]
        : []),
      ...(fixtureWithoutStep.wasteChute
        ? [t('modules:additional_equipment_display_names.wasteChute')]
        : []),
    ]
    return {
      hintKey: 'unused_hardware',
      content: (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('alert:export_warnings.redesign.unused_hardware_content.body1')}
          </StyledText>
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('alert:export_warnings.redesign.unused_hardware')}
            </StyledText>
            {allUnusedContent.map((unusedHardware, i) => (
              <StyledText key={i} desktopStyle="bodyDefaultRegular">
                {unusedHardware}
              </StyledText>
            ))}
          </Flex>
        </Flex>
      ),
    }
  } else {
    return null
  }
}
