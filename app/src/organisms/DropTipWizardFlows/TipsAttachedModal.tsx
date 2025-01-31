import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Trans, useTranslation } from 'react-i18next'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { SmallButton } from '/app/atoms/buttons'
import { OddModal } from '/app/molecules/OddModal'
import { DropTipWizardFlows, useDropTipWizardFlows } from '.'
import { useHomePipettes } from '/app/local-resources/instruments'

import type { HostConfig } from '@opentrons/api-client'
import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'
import type { UseHomePipettesProps } from '/app/local-resources/instruments'
import type { PipetteDetails } from '/app/resources/maintenance_runs'
import type { PipetteWithTip } from '/app/resources/instruments'

type TipsAttachedModalProps = Pick<UseHomePipettesProps, 'onSettled'> & {
  aPipetteWithTip: PipetteWithTip
  host: HostConfig | null
  setTipStatusResolved: (onEmpty?: () => void) => Promise<void>
}

export const handleTipsAttachedModal = (
  props: TipsAttachedModalProps
): Promise<unknown> => {
  return NiceModal.show(TipsAttachedModal, {
    ...props,
  })
}

const TipsAttachedModal = NiceModal.create(
  (props: TipsAttachedModalProps): JSX.Element => {
    const {
      aPipetteWithTip,
      host,
      setTipStatusResolved,
      ...homePipetteProps
    } = props
    const { t } = useTranslation(['drop_tip_wizard'])
    const modal = useModal()

    const { mount, specs } = aPipetteWithTip
    const { showDTWiz, disableDTWiz, enableDTWiz } = useDropTipWizardFlows()
    const { homePipettes, isHoming } = useHomePipettes({
      ...homePipetteProps,
      pipetteInfo: buildPipetteDetails(aPipetteWithTip),
      onSettled: () => {
        modal.remove()
        void setTipStatusResolved()
      },
    })

    const tipsAttachedHeader: OddModalHeaderBaseProps = {
      title: t('remove_any_attached_tips'),
      iconName: 'ot-alert',
      iconColor: COLORS.red50,
    }

    const onHomePipettes = (): void => {
      homePipettes()
    }

    const cleanUpAndClose = (isTakeover?: boolean): void => {
      disableDTWiz()

      if (!isTakeover) {
        modal.remove()
        void setTipStatusResolved()
      }
    }

    const is96Channel = specs.channels === 96
    const displayMountText = is96Channel ? '96-Channel' : (mount as string)

    return (
      <ApiHostProvider {...host} hostname={host?.hostname ?? null}>
        <OddModal header={tipsAttachedHeader}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
            <LegacyStyledText as="p">
              <Trans
                t={t}
                i18nKey="liquid_damages_this_pipette"
                values={{
                  mount: displayMountText,
                }}
                components={{
                  mount: <strong />,
                }}
              />
            </LegacyStyledText>
            <Flex gridGap={SPACING.spacing8}>
              <SmallButton
                flex="1"
                buttonType="secondary"
                buttonText={t('skip_and_home_pipette')}
                onClick={onHomePipettes}
                disabled={isHoming}
              />
              <SmallButton
                flex="1"
                buttonText={t('begin_removal')}
                onClick={enableDTWiz}
                disabled={isHoming}
              />
            </Flex>
          </Flex>
        </OddModal>
        {showDTWiz ? (
          <DropTipWizardFlows
            instrumentModelSpecs={specs}
            mount={mount}
            robotType={FLEX_ROBOT_TYPE}
            closeFlow={isTakeover => {
              cleanUpAndClose(isTakeover)
            }}
            modalStyle="simple"
          />
        ) : null}
      </ApiHostProvider>
    )
  }
)

// TODO(jh, 09-12-24): Consolidate this with the same utility that exists elsewhere.
function buildPipetteDetails(
  aPipetteWithTip: PipetteWithTip | null
): PipetteDetails | null {
  return aPipetteWithTip != null
    ? {
        pipetteId: aPipetteWithTip.specs.name,
        mount: aPipetteWithTip.mount,
      }
    : null
}
