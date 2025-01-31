import { useTranslation } from 'react-i18next'
import {
  SINGLE_MOUNT_PIPETTES,
  WEIGHT_OF_96_CHANNEL,
} from '@opentrons/shared-data'
import {
  Flex,
  Banner,
  JUSTIFY_CENTER,
  SIZE_1,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import { Skeleton } from '/app/atoms/Skeleton'
import { CheckPipetteButton } from './CheckPipetteButton'
import { BODY_STYLE, SECTIONS } from './constants'
import { getPipetteAnimations, getPipetteAnimations96 } from './utils'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { PipetteWizardStepProps } from './types'

interface MountPipetteProps extends PipetteWizardStepProps {
  isFetching: boolean
  setFetching: Dispatch<SetStateAction<boolean>>
}
const BACKGROUND_SIZE = '47rem'

export const MountPipette = (props: MountPipetteProps): JSX.Element => {
  const {
    proceed,
    goBack,
    selectedPipette,
    isFetching,
    setFetching,
    isOnDevice,
    mount,
    flowType,
  } = props
  const { t, i18n } = useTranslation('pipette_wizard_flows')
  const pipetteWizardStep = { mount, flowType, section: SECTIONS.MOUNT_PIPETTE }
  const isSingleMountPipette = selectedPipette === SINGLE_MOUNT_PIPETTES

  const bodyTextSkeleton = (
    <Skeleton
      width="18rem"
      height="1.125rem"
      backgroundSize={BACKGROUND_SIZE}
    />
  )
  let bodyText: ReactNode = <div></div>
  if (isFetching) {
    bodyText = (
      <>
        {bodyTextSkeleton}
        {bodyTextSkeleton}
        {bodyTextSkeleton}
        {bodyTextSkeleton}
      </>
    )
  } else {
    bodyText = (
      <>
        <LegacyStyledText css={BODY_STYLE}>
          {isSingleMountPipette
            ? t('align_the_connector')
            : t('hold_pipette_carefully')}
        </LegacyStyledText>
        {!isSingleMountPipette ? (
          <Banner
            type="warning"
            size={isOnDevice ? '1.5rem' : SIZE_1}
            marginY={SPACING.spacing4}
          >
            {t('pipette_heavy', { weight: WEIGHT_OF_96_CHANNEL })}
          </Banner>
        ) : null}
      </>
    )
  }

  return (
    <GenericWizardTile
      header={
        isFetching ? (
          <Skeleton
            width="17rem"
            height="1.75rem"
            backgroundSize={BACKGROUND_SIZE}
          />
        ) : (
          i18n.format(
            t(
              isSingleMountPipette
                ? 'connect_and_secure_pipette'
                : 'connect_96_channel'
            ),
            'capitalize'
          )
        )
      }
      rightHandBody={
        isFetching ? (
          <Skeleton
            width="10.6875rem"
            height="15.5rem"
            backgroundSize={BACKGROUND_SIZE}
          />
        ) : (
          <Flex justifyContent={JUSTIFY_CENTER}>
            {isSingleMountPipette
              ? getPipetteAnimations({ pipetteWizardStep })
              : getPipetteAnimations96({
                  section: pipetteWizardStep.section,
                  flowType: flowType,
                })}
          </Flex>
        )
      }
      bodyText={bodyText}
      backIsDisabled={isFetching}
      back={goBack}
      proceedButton={
        <CheckPipetteButton
          isOnDevice={isOnDevice}
          proceed={proceed}
          proceedButtonText={t('continue')}
          setFetching={setFetching}
          isFetching={isFetching}
        />
      }
    />
  )
}
