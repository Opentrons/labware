import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { RIGHT, WEIGHT_OF_96_CHANNEL } from '@opentrons/shared-data'
import { useInstrumentsQuery } from '@opentrons/react-api-client'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  Banner,
  Btn,
  COLORS,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  PrimaryButton,
  RESPONSIVENESS,
  SIZE_1,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { GenericWizardTile } from '/app/molecules/GenericWizardTile'
import {
  SimpleWizardBody,
  SimpleWizardInProgressBody,
} from '/app/molecules/SimpleWizardBody'
import { Skeleton } from '/app/atoms/Skeleton'
import { SmallButton } from '/app/atoms/buttons'
import { BODY_STYLE, SECTIONS } from './constants'
import { getPipetteAnimations, getPipetteAnimations96 } from './utils'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { PipetteData } from '@opentrons/api-client'
import type { PipetteWizardStepProps } from './types'

interface DetachPipetteProps extends PipetteWizardStepProps {
  isFetching: boolean
  setFetching: Dispatch<SetStateAction<boolean>>
}
const BACKGROUND_SIZE = '47rem'

const GO_BACK_BUTTON_TEXT_STYLE = css`
  ${TYPOGRAPHY.pSemiBold};
  color: ${COLORS.grey50};

  &:hover {
    opacity: 70%;
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
    font-size: ${TYPOGRAPHY.fontSize22};
    line-height: ${TYPOGRAPHY.lineHeight28};

    &:hover {
      opacity: 100%;
    }
  }
`

export const DetachPipette = (props: DetachPipetteProps): JSX.Element => {
  const {
    isRobotMoving,
    goBack,
    proceed,
    attachedPipettes,
    mount,
    isFetching,
    setFetching,
    chainRunCommands,
    isOnDevice,
    flowType,
    errorMessage,
    setShowErrorMessage,
  } = props
  const { t, i18n } = useTranslation(['pipette_wizard_flows', 'shared'])
  const { refetch, data: attachedInstrumentsData } = useInstrumentsQuery({
    enabled: false,
    onSettled: () => {
      setFetching(false)
    },
  })
  const pipetteWizardStep = {
    mount,
    flowType,
    section: SECTIONS.DETACH_PIPETTE,
  }
  const memoizedAttachedPipettes = useMemo(() => attachedPipettes, [])
  const is96ChannelPipette =
    memoizedAttachedPipettes[mount]?.instrumentName === 'p1000_96'
  const pipetteName =
    attachedPipettes[mount] != null
      ? attachedPipettes[mount]?.displayName
      : 'Pipette'
  const isPipetteStillAttached = (attachedInstrumentsData?.data ?? []).some(
    (i): i is PipetteData =>
      i.instrumentType === 'pipette' && i.ok && i.mount === mount
  )

  const handle96ChannelProceed = (): void => {
    chainRunCommands?.(
      [
        {
          commandType: 'home' as const,
          params: {
            axes: ['leftZ'],
          },
        },
        {
          commandType: 'calibration/moveToMaintenancePosition' as const,
          params: {
            mount: RIGHT,
            maintenancePosition: 'attachPlate',
          },
        },
      ],
      false
    )
      .then(() => {
        proceed()
      })
      .catch(error => {
        setShowErrorMessage(error.message as string)
      })
  }

  const [showPipetteStillAttached, setShowPipetteStillAttached] = useState(
    false
  )

  const handleOnClick = (): void => {
    setFetching(true)
    refetch()
      .then(() => {
        if (!isPipetteStillAttached) {
          is96ChannelPipette ? handle96ChannelProceed() : proceed()
        } else {
          setShowPipetteStillAttached(true)
        }
      })
      .catch(() => {
        setShowPipetteStillAttached(true)
      })
  }

  const channel = memoizedAttachedPipettes[mount]?.data.channels
  let bodyText: ReactNode = <div></div>
  if (isFetching) {
    bodyText = (
      <>
        <Skeleton
          width="18rem"
          height="1.125rem"
          backgroundSize={BACKGROUND_SIZE}
        />
        <Skeleton
          width="18rem"
          height="1.125rem"
          backgroundSize={BACKGROUND_SIZE}
        />
      </>
    )
  } else {
    bodyText = (
      <>
        <LegacyStyledText css={BODY_STYLE}>
          {t('hold_and_loosen')}
        </LegacyStyledText>
        {is96ChannelPipette && (
          <Banner
            type="warning"
            size={Boolean(isOnDevice) ? '1.5rem' : SIZE_1}
            marginY={SPACING.spacing4}
          >
            {t('pipette_heavy', { weight: WEIGHT_OF_96_CHANNEL })}
          </Banner>
        )}
      </>
    )
  }

  if (isRobotMoving)
    return <SimpleWizardInProgressBody description={t('stand_back')} />
  if (showPipetteStillAttached) {
    return (
      <SimpleWizardBody
        iconColor={COLORS.red50}
        header={t('pipette_failed_to_detach', { pipetteName })}
        isSuccess={false}
      >
        <Flex
          width="100%"
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={Boolean(isOnDevice) ? ALIGN_CENTER : ALIGN_FLEX_END}
          gridGap={SPACING.spacing8}
        >
          <Btn
            onClick={() => {
              setShowPipetteStillAttached(false)
            }}
            marginLeft={SPACING.spacing32}
          >
            <LegacyStyledText css={GO_BACK_BUTTON_TEXT_STYLE}>
              {t('shared:go_back')}
            </LegacyStyledText>
          </Btn>
          {Boolean(isOnDevice) ? (
            <SmallButton
              disabled={isFetching}
              buttonText={i18n.format(t('try_again'), 'capitalize')}
              onClick={handleOnClick}
            />
          ) : (
            <PrimaryButton disabled={isFetching} onClick={handleOnClick}>
              {i18n.format(t('try_again'), 'capitalize')}
            </PrimaryButton>
          )}
        </Flex>
      </SimpleWizardBody>
    )
  }
  return errorMessage != null ? (
    <SimpleWizardBody
      isSuccess={false}
      iconColor={COLORS.red50}
      header={t('shared:error_encountered')}
      subHeader={errorMessage}
    />
  ) : (
    <GenericWizardTile
      header={
        isFetching ? (
          <Skeleton
            width="17rem"
            height="1.75rem"
            backgroundSize={BACKGROUND_SIZE}
          />
        ) : (
          `${i18n.format(t('loose_detach'))}${
            memoizedAttachedPipettes[mount]?.displayName
          }`
        )
      }
      rightHandBody={
        isFetching ? (
          <Skeleton
            width="100%"
            height="14.375rem"
            backgroundSize={BACKGROUND_SIZE}
          />
        ) : is96ChannelPipette ? (
          getPipetteAnimations96({
            section: pipetteWizardStep.section,
            flowType,
          })
        ) : (
          getPipetteAnimations({ pipetteWizardStep, channel })
        )
      }
      bodyText={bodyText}
      backIsDisabled={isFetching}
      back={goBack}
      proceedButtonText={i18n.format(t('shared:continue'), 'capitalize')}
      proceed={handleOnClick}
      proceedIsDisabled={isFetching}
    />
  )
}
