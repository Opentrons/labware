import { Slideout } from '../../atoms/Slideout'
import { StyledText } from '../../atoms/text'
import { useLogger } from '../../logger'
import { DeckThumbnail } from '../../molecules/DeckThumbnail'
import { MiniCard } from '../../molecules/MiniCard'
import type { Robot } from '../../redux/discovery/types'
import { getStoredProtocols } from '../../redux/protocol-storage'
import type { StoredProtocolData } from '../../redux/protocol-storage'
import type { State } from '../../redux/types'
import { ApplyHistoricOffsets } from '../ApplyHistoricOffsets'
import { useOffsetCandidatesForAnalysis } from '../ApplyHistoricOffsets/hooks/useOffsetCandidatesForAnalysis'
import { useCreateRunFromProtocol } from '../ChooseRobotToRunProtocolSlideout/useCreateRunFromProtocol'
import { useTrackCreateProtocolRunEvent } from '../Devices/hooks'
import {
  SPACING,
  SIZE_1,
  TYPOGRAPHY,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  Box,
  Flex,
  BORDERS,
  DIRECTION_COLUMN,
  DISPLAY_BLOCK,
  Icon,
  PrimaryButton,
  COLORS,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'
import first from 'lodash/first'
import path from 'path'
import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { Link, NavLink, useHistory } from 'react-router-dom'
import { css } from 'styled-components'

interface ChooseProtocolSlideoutProps {
  robot: Robot
  onCloseClick: () => void
  showSlideout: boolean
}
export function ChooseProtocolSlideoutComponent(
  props: ChooseProtocolSlideoutProps
): JSX.Element | null {
  const { t } = useTranslation(['device_details', 'shared'])
  const history = useHistory()
  const logger = useLogger(__filename)
  const { robot, showSlideout, onCloseClick } = props
  const { name } = robot
  const storedProtocols = useSelector((state: State) =>
    getStoredProtocols(state)
  )
  const [
    selectedProtocol,
    setSelectedProtocol,
  ] = React.useState<StoredProtocolData | null>(first(storedProtocols) ?? null)

  const { trackCreateProtocolRunEvent } = useTrackCreateProtocolRunEvent(
    selectedProtocol
  )

  const srcFileObjects =
    selectedProtocol != null
      ? selectedProtocol.srcFiles.map((srcFileBuffer, index) => {
          const srcFilePath = selectedProtocol.srcFileNames[index]
          return new File([srcFileBuffer], path.basename(srcFilePath))
        })
      : []

  const [shouldApplyOffsets, setShouldApplyOffsets] = React.useState(true)
  const offsetCandidates = useOffsetCandidatesForAnalysis(
    selectedProtocol?.mostRecentAnalysis ?? null,
    robot.ip
  )

  const {
    createRunFromProtocolSource,
    runCreationError,
    isCreatingRun,
    reset: resetCreateRun,
    runCreationErrorCode,
  } = useCreateRunFromProtocol(
    {
      onSuccess: ({ data: runData }) => {
        trackCreateProtocolRunEvent({
          name: 'createProtocolRecordResponse',
          properties: { success: true },
        })
        history.push(`/devices/${name}/protocol-runs/${runData.id}`)
      },
      onError: (error: Error) => {
        trackCreateProtocolRunEvent({
          name: 'createProtocolRecordResponse',
          properties: { success: false, error: error.message },
        })
      },
    },
    { hostname: robot.ip },
    shouldApplyOffsets
      ? offsetCandidates.map(({ vector, location, definitionUri }) => ({
          vector,
          location,
          definitionUri,
        }))
      : []
  )

  const handleProceed: React.MouseEventHandler<HTMLButtonElement> = () => {
    if (selectedProtocol != null) {
      trackCreateProtocolRunEvent({ name: 'createProtocolRecordRequest' })
      createRunFromProtocolSource({
        files: srcFileObjects,
        protocolKey: selectedProtocol.protocolKey,
      })
    } else {
      logger.warn('failed to create protocol, no protocol selected')
    }
  }
  return (
    <Slideout
      isExpanded={showSlideout}
      onCloseClick={onCloseClick}
      title={t('choose_protocol_to_run', { name })}
      footer={
        <ApiHostProvider hostname={robot.ip}>
          <ApplyHistoricOffsets
            offsetCandidates={offsetCandidates}
            shouldApplyOffsets={shouldApplyOffsets}
            setShouldApplyOffsets={setShouldApplyOffsets}
            commands={selectedProtocol?.mostRecentAnalysis?.commands ?? []}
            labware={selectedProtocol?.mostRecentAnalysis?.labware ?? []}
            modules={selectedProtocol?.mostRecentAnalysis?.modules ?? []}
          />
          <PrimaryButton
            onClick={handleProceed}
            disabled={isCreatingRun || selectedProtocol == null}
            width="100%"
          >
            {isCreatingRun ? (
              <Icon name="ot-spinner" spin size={SIZE_1} />
            ) : (
              t('shared:proceed_to_setup')
            )}
          </PrimaryButton>
        </ApiHostProvider>
      }
    >
      {storedProtocols.length > 0 ? (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          {storedProtocols.map(storedProtocol => {
            const isSelected =
              selectedProtocol != null &&
              storedProtocol.protocolKey === selectedProtocol.protocolKey
            return (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                key={storedProtocol.protocolKey}
              >
                <MiniCard
                  isSelected={isSelected}
                  isError={runCreationError != null}
                  onClick={() => {
                    if (!isCreatingRun) {
                      resetCreateRun()
                      setSelectedProtocol(storedProtocol)
                    }
                  }}
                >
                  <Box display="grid" gridTemplateColumns="1fr 3fr">
                    <Box
                      marginY={SPACING.spacingAuto}
                      backgroundColor={isSelected ? COLORS.white : 'inherit'}
                      marginRight={SPACING.spacing16}
                      height="4.25rem"
                      width="4.75rem"
                    >
                      <DeckThumbnail
                        commands={
                          storedProtocol.mostRecentAnalysis?.commands ?? []
                        }
                        labware={
                          storedProtocol.mostRecentAnalysis?.labware ?? []
                        }
                      />
                    </Box>
                    <StyledText
                      as="p"
                      fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                      overflowWrap="anywhere"
                    >
                      {storedProtocol.mostRecentAnalysis?.metadata
                        ?.protocolName ??
                        first(storedProtocol.srcFileNames) ??
                        storedProtocol.protocolKey}
                    </StyledText>
                  </Box>
                  {runCreationError != null && isSelected ? (
                    <>
                      <Box flex="1 1 auto" />
                      <Icon
                        name="alert-circle"
                        size="1.25rem"
                        color={COLORS.errorEnabled}
                      />
                    </>
                  ) : null}
                </MiniCard>
                {runCreationError != null && isSelected ? (
                  <StyledText
                    as="label"
                    color={COLORS.errorText}
                    overflowWrap="anywhere"
                    display={DISPLAY_BLOCK}
                    marginTop={`-${SPACING.spacing4}`}
                    marginBottom={SPACING.spacing8}
                  >
                    {runCreationErrorCode === 409 ? (
                      <Trans
                        t={t}
                        i18nKey="shared:robot_is_busy_no_protocol_run_allowed"
                        components={{
                          robotLink: (
                            <NavLink
                              css={css`
                                color: ${COLORS.errorText};
                                text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
                              `}
                              to={`/devices/${robot.name}`}
                            />
                          ),
                        }}
                      />
                    ) : (
                      runCreationError
                    )}
                  </StyledText>
                ) : null}
              </Flex>
            )
          })}
        </Flex>
      ) : (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
          width="100%"
          minHeight="11rem"
          padding={SPACING.spacing16}
          css={BORDERS.cardOutlineBorder}
        >
          <Icon
            size="1.25rem"
            name="alert-circle"
            color={COLORS.medGreyEnabled}
          />
          <StyledText
            as="p"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            marginTop={SPACING.spacing8}
            role="heading"
          >
            {t('no_protocols_found')}
          </StyledText>
          <StyledText
            as="p"
            marginTop={SPACING.spacing8}
            textAlign={TYPOGRAPHY.textAlignCenter}
          >
            <Trans
              t={t}
              i18nKey="to_run_protocol_go_to_protocols_page"
              components={{
                navlink: (
                  <Link to="/protocols" css={TYPOGRAPHY.linkPSemiBold} />
                ),
              }}
            />
          </StyledText>
        </Flex>
      )}
    </Slideout>
  )
}

export function ChooseProtocolSlideout(
  props: ChooseProtocolSlideoutProps
): JSX.Element | null {
  return <ChooseProtocolSlideoutComponent {...props} />
}
