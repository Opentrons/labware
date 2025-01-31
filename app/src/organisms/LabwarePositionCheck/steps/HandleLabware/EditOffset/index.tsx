import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  LabwareRender,
  LegacyStyledText,
  ModalShell,
  PipetteRender,
  PrimaryButton,
  RESPONSIVENESS,
  RobotWorkSpace,
  SecondaryButton,
  SPACING,
  TYPOGRAPHY,
  WELL_LABEL_OPTIONS,
} from '@opentrons/components'
import {
  getVectorDifference,
  getVectorSum,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import { getTopPortalEl } from '/app/App/portal'
import { SmallButton } from '/app/atoms/buttons'
import { NeedHelpLink } from '/app/molecules/OT2CalibrationNeedHelpLink'
import { JogControls } from '/app/molecules/JogControls'
import { LiveOffsetValue } from './LiveOffsetValue'
import {
  selectSelectedLwExistingOffset,
  selectSelectedLwInitialPosition,
  selectActivePipette,
  selectIsSelectedLwTipRack,
  selectSelectedLabwareDef,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'

import levelProbeWithTip from '/app/assets/images/lpc_level_probe_with_tip.svg'
import levelProbeWithLabware from '/app/assets/images/lpc_level_probe_with_labware.svg'

import type { ReactNode } from 'react'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { VectorOffset } from '@opentrons/api-client'
import type { Jog } from '/app/molecules/JogControls'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

const DECK_MAP_VIEWBOX = '-10 -10 150 105'
const LPC_HELP_LINK_URL =
  'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'

interface JogToWellProps extends LPCWizardContentProps {
  header: ReactNode
  body: ReactNode
  handleConfirmPosition: () => void
  handleGoBack: () => void
  handleJog: Jog
}

export function EditOffset(props: JogToWellProps): JSX.Element {
  const {
    runId,
    header,
    body,
    handleConfirmPosition,
    handleGoBack,
    handleJog,
  } = props
  const { t } = useTranslation(['labware_position_check', 'shared'])

  const isOnDevice = useSelector(getIsOnDevice)
  const initialPosition =
    useSelector(selectSelectedLwInitialPosition(runId)) ?? IDENTITY_VECTOR
  const pipetteName =
    useSelector(selectActivePipette(runId))?.pipetteName ?? 'p1000_single'
  const itemLwDef = useSelector(
    selectSelectedLabwareDef(runId)
  ) as LabwareDefinition2
  const isTipRack = useSelector(selectIsSelectedLwTipRack(runId))
  const activeLwExistingOffset = useSelector(
    selectSelectedLwExistingOffset(runId)
  )

  const [joggedPosition, setJoggedPosition] = useState<VectorOffset>(
    initialPosition
  )
  const [showFullJogControls, setShowFullJogControls] = useState(false)

  const levelSrc = isTipRack ? levelProbeWithTip : levelProbeWithLabware
  const liveOffset = getVectorSum(
    activeLwExistingOffset,
    getVectorDifference(joggedPosition, initialPosition)
  )

  useEffect(() => {
    //  NOTE: this will perform a "null" jog when the jog controls mount so
    //  if a user reaches the "confirm exit" modal (unmounting this component)
    //  and clicks "go back" we are able so initialize the live offset to whatever
    //  distance they had already jogged before clicking exit.
    // the `mounted` variable prevents a possible memory leak (see https://legacy.reactjs.org/docs/hooks-effect.html#example-using-hooks-1)
    let mounted = true
    if (mounted) {
      handleJog('x', 1, 0, setJoggedPosition)
    }
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Flex css={CONTAINER_STYLE}>
      <Flex css={CONTENT_GRID_STYLE}>
        <Flex css={INFO_CONTAINER_STYLE}>
          <Header>{header}</Header>
          {body}
          <LiveOffsetValue {...liveOffset} {...props} />
        </Flex>
        <Flex css={RENDER_CONTAINER_STYLE}>
          <RobotWorkSpace viewBox={DECK_MAP_VIEWBOX}>
            {() => (
              <>
                <LabwareRender
                  definition={itemLwDef}
                  wellStroke={{ A1: COLORS.blue50 }}
                  wellLabelOption={WELL_LABEL_OPTIONS.SHOW_LABEL_OUTSIDE}
                  highlightedWellLabels={{ wells: ['A1'] }}
                  labwareStroke={COLORS.grey30}
                  wellLabelColor={COLORS.grey30}
                />
                <PipetteRender
                  labwareDef={itemLwDef}
                  pipetteName={pipetteName}
                  usingMetalProbe={true}
                />
              </>
            )}
          </RobotWorkSpace>
          <img
            width="89px"
            height="145px"
            src={levelSrc}
            alt={`level with ${isTipRack ? 'tip' : 'labware'}`}
          />
        </Flex>
      </Flex>
      {isOnDevice ? (
        <Flex css={FOOTER_CONTAINER_STYLE}>
          <SmallButton
            buttonType="tertiaryLowLight"
            buttonText={t('shared:go_back')}
            onClick={handleGoBack}
          />
          <Flex css={BUTTON_GROUP_STYLE}>
            <SmallButton
              buttonType="secondary"
              buttonText={t('move_pipette')}
              onClick={() => {
                setShowFullJogControls(true)
              }}
            />
            <SmallButton
              buttonText={t('shared:confirm_position')}
              onClick={handleConfirmPosition}
            />
          </Flex>
          {showFullJogControls
            ? createPortal(
                <ModalShell
                  width="60rem"
                  height="33.5rem"
                  padding={SPACING.spacing32}
                  display="flex"
                  flexDirection={DIRECTION_COLUMN}
                  justifyContent={JUSTIFY_SPACE_BETWEEN}
                  header={
                    <LegacyStyledText
                      as="h4"
                      css={css`
                        font-weight: ${TYPOGRAPHY.fontWeightBold};
                        font-size: ${TYPOGRAPHY.fontSize28};
                        line-height: ${TYPOGRAPHY.lineHeight36};
                      `}
                    >
                      {t('move_to_a1_position')}
                    </LegacyStyledText>
                  }
                  footer={
                    <SmallButton
                      width="100%"
                      textTransform={TYPOGRAPHY.textTransformCapitalize}
                      buttonText={t('shared:close')}
                      onClick={() => {
                        setShowFullJogControls(false)
                      }}
                    />
                  }
                >
                  <JogControls
                    jog={(axis, direction, step, _onSuccess) =>
                      handleJog(axis, direction, step, setJoggedPosition)
                    }
                    isOnDevice={true}
                  />
                </ModalShell>,
                getTopPortalEl()
              )
            : null}
        </Flex>
      ) : (
        <>
          <JogControls
            jog={(axis, direction, step, _onSuccess) =>
              handleJog(axis, direction, step, setJoggedPosition)
            }
          />
          <Flex css={FOOTER_CONTAINER_STYLE}>
            <NeedHelpLink href={LPC_HELP_LINK_URL} />
            <Flex css={BUTTON_GROUP_STYLE}>
              <SecondaryButton onClick={handleGoBack}>
                {t('shared:go_back')}
              </SecondaryButton>
              <PrimaryButton onClick={handleConfirmPosition}>
                {t('shared:confirm_position')}
              </PrimaryButton>
            </Flex>
          </Flex>
        </>
      )}
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  padding: ${SPACING.spacing32};
  min-height: 29.5rem;
`

const CONTENT_GRID_STYLE = css`
  grid-gap: ${SPACING.spacing24};
`

const INFO_CONTAINER_STYLE = css`
  flex: 1;
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing8};
  align-items: ${ALIGN_FLEX_START};
`

const RENDER_CONTAINER_STYLE = css`
  flex: 1;
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing20};
`

const FOOTER_CONTAINER_STYLE = css`
  width: 100%;
  margin-top: ${SPACING.spacing32};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
`

const BUTTON_GROUP_STYLE = css`
  grid-gap: ${SPACING.spacing8};
  align-items: ${ALIGN_CENTER};
`

const Header = styled.h1`
  ${TYPOGRAPHY.h1Default}

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`
