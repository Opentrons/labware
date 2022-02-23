import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Portal } from '../../../App/portal'
import { useSelector } from 'react-redux'
import { getConnectedRobotName } from '../../../redux/robot/selectors'
import { Interstitial } from '../../../atoms/Interstitial/Interstitial'
import { getAttachedModules } from '../../../redux/modules'
import { Introduction } from './Introduction'
import { KeyParts } from './KeyParts'
import { AttachModule } from './AttachModule'
import { AttachAdapter } from './AttachAdapter'
import { PowerOn } from './PowerOn'
import { TestShake } from './TestShake'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryBtn,
  SecondaryBtn,
  SPACING,
  TEXT_TRANSFORM_NONE,
  JUSTIFY_FLEX_END,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import type { State } from '../../../redux/types'

interface HeaterShakerWizardProps {
  onCloseClick: () => unknown
}

export const HeaterShakerWizard = (
  props: HeaterShakerWizardProps
): JSX.Element | null => {
  const { onCloseClick } = props
  const { t } = useTranslation(['heater_shaker', 'shared'])
  const [currentPage, setCurrentPage] = React.useState(0)
  const robotName = useSelector((state: State) => getConnectedRobotName(state))
  const attachedModules = useSelector((state: State) =>
    getAttachedModules(state, robotName === null ? null : robotName)
  )
  const [targetProps, tooltipProps] = useHoverTooltip()

  const heaterShakerAttachedIndex = attachedModules.findIndex(
    //  TODO(jr, 2022-02-18): get heaterShaker module when model exists
    module => module.model === 'magneticModuleV2'
  )

  let buttonContent = null
  let isDisabled: boolean = false
  const getWizardDisplayPage = (): JSX.Element | null => {
    switch (currentPage) {
      case 0:
        buttonContent = t('btn_continue_attachment_guide')
        return (
          <Introduction
          //  TODO(jr, 2022-02-16): get labwareDefinition2 of labware on top of heater shaker (nestedLabwareDef from moduleRenderInfoById)
          //  TODO(jr, 2022-02-16): get adapter name and image - would this be connected to nestedLabwareDefinition?
          />
        )
      case 1:
        buttonContent = t('btn_begin_attachment')
        return <KeyParts />
      case 2:
        buttonContent = t('btn_thermal_adapter')
        return <AttachModule slotName={'1'} />
      case 3:
        buttonContent = t('btn_power_module')
        return <AttachAdapter />
      case 4:
        buttonContent = t('btn_test_shake')
        isDisabled = heaterShakerAttachedIndex === -1
        return (
          <PowerOn
            isAttached={!isDisabled}
            attachedModule={
              !isDisabled ? attachedModules[heaterShakerAttachedIndex] : null
            }
          />
        )
      case 5:
        buttonContent = t('complete')
        return <TestShake />
      default:
        return null
    }
  }

  return (
    <Portal level="top">
      <Interstitial
        titleBar={{
          title: t('heater_shaker_setup_description', { name: robotName }),
          exit: {
            onClick: () => onCloseClick(),
            title: t('shared:exit'),
            children: t('shared:exit'),
          },
        }}
      >
        {getWizardDisplayPage()}
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={
            currentPage === 0 ? JUSTIFY_FLEX_END : JUSTIFY_SPACE_BETWEEN
          }
        >
          {currentPage > 0 ? (
            <SecondaryBtn
              alignItems={ALIGN_CENTER}
              color={COLORS.blue}
              borderRadius={SPACING.spacingS}
              textTransform={TEXT_TRANSFORM_NONE}
              data-testid={`wizard_back_btn`}
              onClick={() => setCurrentPage(currentPage => currentPage - 1)}
            >
              {t('back')}
            </SecondaryBtn>
          ) : null}
          {currentPage <= 5 ? (
            <PrimaryBtn
              alignItems={ALIGN_CENTER}
              disabled={isDisabled}
              {...targetProps}
              backgroundColor={COLORS.blue}
              borderRadius={SPACING.spacingS}
              textTransform={TEXT_TRANSFORM_NONE}
              data-testid={`wizard_next_btn`}
              onClick={
                currentPage === 5
                  ? () => onCloseClick()
                  : () => setCurrentPage(currentPage => currentPage + 1)
              }
            >
              {buttonContent}
              {isDisabled !== false ? (
                <Tooltip {...tooltipProps}>
                  {t('module_is_not_connected')}
                </Tooltip>
              ) : null}
            </PrimaryBtn>
          ) : null}
        </Flex>
      </Interstitial>
    </Portal>
  )
}
