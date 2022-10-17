import * as React from 'react'
import isEqual from 'lodash/isEqual'
import { Trans, useTranslation } from 'react-i18next'
import { DIRECTION_COLUMN, Flex, TYPOGRAPHY } from '@opentrons/components'
import { StyledText } from '../../atoms/text'
import { RobotMotionLoader } from './RobotMotionLoader'
import { PrepareSpace } from './PrepareSpace'
import { JogToWell } from './JogToWell'
import {
  FIXED_TRASH_ID,
  getIsTiprack,
  getLabwareDefURI,
  getLabwareDisplayName,
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  IDENTITY_VECTOR,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { getLabwareDef } from './utils/labware'
import { UnorderedList } from '../../molecules/UnorderedList'

import type { LabwareOffset } from '@opentrons/api-client'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type {
  CheckLabwareStep,
  CreateRunCommand,
  RegisterPositionAction,
  WorkingOffset,
} from './types'
import type { Jog } from '../../molecules/DeprecatedJogControls/types'
import { getCurrentOffsetForLabwareInLocation } from '../Devices/ProtocolRun/utils/getCurrentOffsetForLabwareInLocation'
import { getDisplayLocation } from './utils/getDisplayLocation'
interface CheckItemProps extends Omit<CheckLabwareStep, 'section'> {
  section: 'CHECK_LABWARE' | 'CHECK_TIP_RACKS'
  protocolData: CompletedProtocolAnalysis
  proceed: () => void
  createRunCommand: CreateRunCommand
  registerPosition: React.Dispatch<RegisterPositionAction>
  workingOffsets: WorkingOffset[]
  existingOffsets: LabwareOffset[]
  handleJog: Jog
  isRobotMoving: boolean
  currentStepIndex: number // ensure rerendering on proceed
}
export const CheckItem = (props: CheckItemProps): JSX.Element | null => {
  const {
    labwareId,
    pipetteId,
    moduleId,
    location,
    protocolData,
    createRunCommand,
    registerPosition,
    workingOffsets,
    proceed,
    handleJog,
    isRobotMoving,
    existingOffsets,
  } = props
  const { t } = useTranslation('labware_position_check')
  const labwareDef = getLabwareDef(labwareId, protocolData)
  const pipetteName =
    protocolData.pipettes.find(p => p.id === pipetteId)?.pipetteName ?? null

  React.useEffect(() => {
    if (
      moduleId != null &&
      'moduleModel' in location &&
      location.moduleModel != null
    ) {
      const moduleType = getModuleType(location.moduleModel)
      if (moduleType === THERMOCYCLER_MODULE_TYPE) {
        createRunCommand({
          command: {
            commandType: 'thermocycler/openLid',
            params: { moduleId },
          },
          waitUntilComplete: true,
        }).catch((e: Error) => {
          console.error(`error opening thermocycler lid: ${e.message}`)
        })
      } else if (moduleType === HEATERSHAKER_MODULE_TYPE) {
        createRunCommand(
          {
            command: {
              commandType: 'heaterShaker/closeLabwareLatch',
              params: { moduleId },
            },
            waitUntilComplete: true,
          },
          {
            onSuccess: _r => {
              createRunCommand({
                command: {
                  commandType: 'heaterShaker/deactivateShaker',
                  params: { moduleId },
                },
                waitUntilComplete: true,
              }).catch((e: Error) => {
                console.error(`error deactivating heater shaker: ${e.message}`)
              })
            },
          }
        ).catch((e: Error) => {
          console.error(`error closing labware latch: ${e.message}`)
        })
      }
    }
  }, [moduleId])

  if (pipetteName == null || labwareDef == null) return null
  const isTiprack = getIsTiprack(labwareDef)
  const displayLocation = getDisplayLocation(location, t)
  const labwareDisplayName = getLabwareDisplayName(labwareDef)
  const placeItemInstruction = isTiprack ? (
    <Trans
      t={t}
      i18nKey="place_a_full_tip_rack_in_location"
      tOptions={{ tip_rack: labwareDisplayName, location: displayLocation }}
      components={{
        bold: (
          <StyledText as="span" fontWeight={TYPOGRAPHY.fontWeightSemiBold} />
        ),
      }}
    />
  ) : (
    <Trans
      t={t}
      i18nKey="place_labware_in_location"
      tOptions={{ labware: labwareDisplayName, location: displayLocation }}
      components={{
        bold: (
          <StyledText as="span" fontWeight={TYPOGRAPHY.fontWeightSemiBold} />
        ),
      }}
    />
  )

  const handleConfirmPlacement = (): void => {
    createRunCommand({
      command: {
        commandType: 'moveLabware' as const,
        params: { labwareId: labwareId, newLocation: location },
      },
      waitUntilComplete: true,
    })
      .then(_moveLabwareResponse => {
        createRunCommand({
          command: {
            commandType: 'moveToWell' as const,
            params: {
              pipetteId: pipetteId,
              labwareId: labwareId,
              wellName: 'A1',
              wellLocation: { origin: 'top' as const },
            },
          },
          waitUntilComplete: true,
        })
          .then(_response => {
            createRunCommand({
              command: { commandType: 'savePosition', params: { pipetteId } },
              waitUntilComplete: true,
            })
              .then(response => {
                const { position } = response.data.result
                registerPosition({
                  type: 'initialPosition',
                  labwareId,
                  location,
                  position,
                })
              })
              .catch((e: Error) => {
                console.error(`error saving position: ${e.message}`)
              })
          })
          .catch((e: Error) => {
            console.error(`error moving to well: ${e.message}`)
          })
      })
      .catch((e: Error) => {
        console.error(`error moving labware: ${e.message}`)
      })
  }
  const handleConfirmPosition = (): void => {
    createRunCommand({
      command: { commandType: 'savePosition', params: { pipetteId } },
      waitUntilComplete: true,
    })
      .then(response => {
        const { position } = response.data.result
        registerPosition({
          type: 'finalPosition',
          labwareId,
          location,
          position,
        })
        createRunCommand({

          command: {
            commandType: 'moveToWell' as const,
            params: {
              pipetteId: pipetteId,
              labwareId: FIXED_TRASH_ID,
              wellName: 'A1',
              wellLocation: { origin: 'top' as const },
            },
          },
          waitUntilComplete: true,
        })
          .then(_moveResponse => {
            createRunCommand({
              command: {
                commandType: 'moveLabware' as const,
                params: { labwareId: labwareId, newLocation: 'offDeck' },
              },
              waitUntilComplete: true,
            })
              .then(_homeResponse => {
                proceed()
              })
              .catch((e: Error) => {
                console.error(`error homing: ${e.message}`)
              })
          })
          .catch((e: Error) => {
            console.error(`error moving labware: ${e.message}`)
          })
      })
      .catch((e: Error) => {
        console.error(`error saving position: ${e.message}`)
      })
  }
  const handleGoBack = (): void => {
    createRunCommand({
      command: { commandType: 'home', params: {} },
      waitUntilComplete: true,
    })
      .then(_response => {
        registerPosition({
          type: 'initialPosition',
          labwareId,
          location,
          position: null,
        })
      })
      .catch((e: Error) => {
        console.error(`error homing: ${e.message}`)
      })
  }
  const initialPosition = workingOffsets.find(
    o =>
      o.labwareId === labwareId &&
      isEqual(o.location, location) &&
      o.initialPosition != null
  )?.initialPosition
  const existingOffset =
    getCurrentOffsetForLabwareInLocation(
      existingOffsets,
      getLabwareDefURI(labwareDef),
      location
    )?.vector ?? IDENTITY_VECTOR

  if (isRobotMoving) return <RobotMotionLoader />
  return (
    <Flex flexDirection={DIRECTION_COLUMN} minHeight="25rem">
      {initialPosition != null ? (
        <JogToWell
          header={t('check_item_in_location', {
            item: isTiprack ? t('tip_rack') : t('labware'),
            location: displayLocation,
          })}
          body={
            <StyledText as="p">
              {isTiprack
                ? t('ensure_nozzle_is_above_tip')
                : t('ensure_tip_is_above_well')}
            </StyledText>
          }
          labwareDef={labwareDef}
          pipetteName={pipetteName}
          handleConfirmPosition={handleConfirmPosition}
          handleGoBack={handleGoBack}
          handleJog={handleJog}
          initialPosition={initialPosition}
          existingOffset={existingOffset}
        />
      ) : (
        <PrepareSpace
          {...props}
          header={t('prepare_item_in_location', {
            item: isTiprack ? t('tip_rack') : t('labware'),
            location: displayLocation,
          })}
          body={
            <UnorderedList
              items={[
                t('place_modules'),
                t('clear_all_slots'),
                placeItemInstruction,
              ]}
            />
          }
          labwareDef={labwareDef}
          confirmPlacement={handleConfirmPlacement}
        />
      )}
    </Flex>
  )
}
